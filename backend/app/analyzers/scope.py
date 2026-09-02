import ast
import builtins
from typing import Optional, Set, Dict, List, Tuple
from app.models.diagnostic import Diagnostic

BUILTINS = set(dir(builtins))


class Scope:
    """
    Tracks variable definitions, parameters, and variable usages across scopes.
    Differentiates between variables defined in ALL control flow paths (definitely_defined)
    and variables defined in SOME control flow paths (possibly_defined).
    """

    def __init__(self, parent: Optional["Scope"] = None, is_function_scope: bool = False):
        self.parent = parent
        self.is_function_scope = is_function_scope
        self.definitely_defined: Set[str] = set()
        self.possibly_defined: Set[str] = set()
        self.parameters: Set[str] = set()
        # Track assignments: name -> list of (line, col, ast.Name node)
        self.assignments: Dict[str, List[Tuple[int, int]]] = {}
        # Track usages: set of used names in this scope
        self.used_names: Set[str] = set()

    def define(self, name: str, line: int = 0, col: int = 0, is_param: bool = False, is_func: bool = False) -> None:
        self.definitely_defined.add(name)
        self.possibly_defined.add(name)
        if is_param:
            self.parameters.add(name)
        elif not is_func:
            if name not in self.assignments:
                self.assignments[name] = []
            self.assignments[name].append((line, col))

    def define_possible(self, name: str, line: int = 0, col: int = 0) -> None:
        """Mark a variable as defined in some branch, but not guaranteed in all."""
        self.possibly_defined.add(name)
        if name not in self.assignments:
            self.assignments[name] = []
        self.assignments[name].append((line, col))

    def mark_used(self, name: str) -> None:
        self.used_names.add(name)
        # Propagate usage up to parent scopes for nested closures
        curr = self.parent
        while curr:
            curr.used_names.add(name)
            curr = curr.parent

    def is_definitely_defined(self, name: str) -> bool:
        if name in self.definitely_defined:
            return True
        if self.parent:
            return self.parent.is_definitely_defined(name)
        return False

    def is_possibly_defined(self, name: str) -> bool:
        if name in self.possibly_defined:
            return True
        if self.parent:
            return self.parent.is_possibly_defined(name)
        return False


class VariableScopeVisitor(ast.NodeVisitor):
    """
    AST Visitor that analyzes scope, undefined variables, used-before-assignment,
    and unused variables.
    """

    def __init__(self):
        self.global_scope = Scope(is_function_scope=False)
        self.current_scope = self.global_scope
        self.diagnostics: List[Diagnostic] = []

    def define(self, name: str, line: int, col: int, is_param: bool = False, is_func: bool = False):
        self.current_scope.define(name, line=line, col=col, is_param=is_param, is_func=is_func)

    def visit_Name(self, node: ast.Name):
        if isinstance(node.ctx, ast.Store):
            self.define(node.id, line=node.lineno, col=node.col_offset + 1)
        elif isinstance(node.ctx, ast.Load):
            self.current_scope.mark_used(node.id)
            if node.id not in BUILTINS:
                if not self.current_scope.is_possibly_defined(node.id):
                    # Completely undefined
                    self.diagnostics.append(
                        Diagnostic(
                            line=node.lineno,
                            column=node.col_offset + 1,
                            severity="error",
                            category="undefined-variable",
                            message=f"Name '{node.id}' is not defined",
                            source="python-ast",
                        )
                    )
                elif not self.current_scope.is_definitely_defined(node.id):
                    # Defined in some branches but not guaranteed before this use
                    self.diagnostics.append(
                        Diagnostic(
                            line=node.lineno,
                            column=node.col_offset + 1,
                            severity="warning",
                            category="used-before-assignment",
                            message=f"Variable '{node.id}' may be used before assignment",
                            source="python-ast",
                        )
                    )
        self.generic_visit(node)

    def visit_Import(self, node: ast.Import):
        for alias in node.names:
            name = alias.asname if alias.asname else alias.name.split(".")[0]
            self.define(name, line=node.lineno, col=node.col_offset + 1)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        for alias in node.names:
            if alias.name == "*":
                continue
            name = alias.asname if alias.asname else alias.name
            self.define(name, line=node.lineno, col=node.col_offset + 1)

    def visit_ClassDef(self, node: ast.ClassDef):
        # Class name belongs to current scope
        self.define(node.name, line=node.lineno, col=node.col_offset + 1, is_func=True)
        for decorator in node.decorator_list:
            self.visit(decorator)
        for base in node.bases:
            self.visit(base)
        for keyword in node.keywords:
            self.visit(keyword)
        for stmt in node.body:
            self.visit(stmt)

    def visit_FunctionDef(self, node: ast.FunctionDef):
        # Function name belongs to current scope
        self.define(node.name, line=node.lineno, col=node.col_offset + 1, is_func=True)

        # Process default argument expressions in outer scope before creating function scope
        for default in node.args.defaults + node.args.kw_defaults:
            if default:
                self.visit(default)

        # Create function scope
        previous_scope = self.current_scope
        function_scope = Scope(parent=previous_scope, is_function_scope=True)
        self.current_scope = function_scope

        # Register parameters
        for arg in node.args.posonlyargs + node.args.args + node.args.kwonlyargs:
            self.define(arg.arg, line=arg.lineno, col=arg.col_offset + 1, is_param=True)

        if node.args.vararg:
            self.define(node.args.vararg.arg, line=node.args.vararg.lineno, col=node.args.vararg.col_offset + 1, is_param=True)

        if node.args.kwarg:
            self.define(node.args.kwarg.arg, line=node.args.kwarg.lineno, col=node.args.kwarg.col_offset + 1, is_param=True)

        # Visit function body statements
        for stmt in node.body:
            self.visit(stmt)

        # Collect unused variables in function scope
        self._check_unused_in_scope(function_scope)

        self.current_scope = previous_scope

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.visit_FunctionDef(node)

    def visit_If(self, node: ast.If):
        # Visit condition
        self.visit(node.test)

        # Branch snapshot
        pre_def = set(self.current_scope.definitely_defined)
        pre_pos = set(self.current_scope.possibly_defined)

        # Analyze 'then' branch
        for stmt in node.body:
            self.visit(stmt)
        then_def = set(self.current_scope.definitely_defined)
        then_pos = set(self.current_scope.possibly_defined)

        # Reset scope definitions back to pre-if state for 'else' branch evaluation
        self.current_scope.definitely_defined = set(pre_def)
        self.current_scope.possibly_defined = set(pre_pos)

        # Analyze 'else' branch
        if node.orelse:
            for stmt in node.orelse:
                self.visit(stmt)
            else_def = set(self.current_scope.definitely_defined)
            else_pos = set(self.current_scope.possibly_defined)
        else:
            else_def = set(pre_def)
            else_pos = set(pre_pos)

        # Combine branch definitions
        self.current_scope.definitely_defined = then_def & else_def
        self.current_scope.possibly_defined = then_pos | else_pos

    def visit_Try(self, node: ast.Try):
        # Save state before try
        pre_def = set(self.current_scope.definitely_defined)
        pre_pos = set(self.current_scope.possibly_defined)

        # Analyze body
        for stmt in node.body:
            self.visit(stmt)
        body_pos = set(self.current_scope.possibly_defined)

        # Any variable defined in try body is possibly defined
        self.current_scope.definitely_defined = set(pre_def)
        self.current_scope.possibly_defined = pre_pos | body_pos

        for handler in node.handlers:
            if handler.name:
                self.define(handler.name, line=handler.lineno, col=handler.col_offset + 1)
            for stmt in handler.body:
                self.visit(stmt)

        if node.orelse:
            for stmt in node.orelse:
                self.visit(stmt)

        if node.finalbody:
            for stmt in node.finalbody:
                self.visit(stmt)

    def visit_For(self, node: ast.For):
        self.visit(node.iter)
        # Target variable(s) assigned in loop
        self._visit_target(node.target)
        for stmt in node.body:
            self.visit(stmt)
        if node.orelse:
            for stmt in node.orelse:
                self.visit(stmt)

    def visit_AsyncFor(self, node: ast.AsyncFor):
        self.visit_For(node)

    def visit_While(self, node: ast.While):
        self.visit(node.test)
        for stmt in node.body:
            self.visit(stmt)
        if node.orelse:
            for stmt in node.orelse:
                self.visit(stmt)

    def _visit_target(self, node: ast.AST):
        if isinstance(node, ast.Name):
            self.define(node.id, line=node.lineno, col=node.col_offset + 1)
        elif isinstance(node, (ast.Tuple, ast.List)):
            for elt in node.elts:
                self._visit_target(elt)

    def _check_unused_in_scope(self, scope: Scope):
        for name, assign_list in scope.assignments.items():
            if name in scope.parameters:
                continue
            if name == "_" or name.startswith("_"):
                continue
            if name not in scope.used_names:
                for line, col in assign_list:
                    self.diagnostics.append(
                        Diagnostic(
                            line=line,
                            column=col,
                            severity="warning",
                            category="unused-variable",
                            message=f"Variable '{name}' is assigned but never used",
                            source="python-ast",
                        )
                    )

    def check_global_unused(self):
        """Check unused variables at module level."""
        self._check_unused_in_scope(self.global_scope)
