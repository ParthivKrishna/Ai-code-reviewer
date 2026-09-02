import ast
from typing import List, Tuple
from app.models.diagnostic import Diagnostic


class ControlFlowVisitor(ast.NodeVisitor):
    """
    Analyzes control flow for:
    1. Unreachable code after return, raise, break, continue.
    2. Function return paths (missing return in non-void function).
    """

    def __init__(self):
        self.diagnostics: List[Diagnostic] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self._analyze_function(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self._analyze_function(node)
        self.generic_visit(node)

    def _analyze_function(self, node: ast.AST):
        body = getattr(node, "body", [])
        self._check_unreachable_statements(body)
        self._check_function_return_paths(node)

    def visit_If(self, node: ast.If):
        self._check_unreachable_statements(node.body)
        if node.orelse:
            self._check_unreachable_statements(node.orelse)
        self.generic_visit(node)

    def visit_For(self, node: ast.For):
        self._check_unreachable_statements(node.body)
        if node.orelse:
            self._check_unreachable_statements(node.orelse)
        self.generic_visit(node)

    def visit_AsyncFor(self, node: ast.AsyncFor):
        self.visit_For(node)

    def visit_While(self, node: ast.While):
        self._check_unreachable_statements(node.body)
        if node.orelse:
            self._check_unreachable_statements(node.orelse)
        self.generic_visit(node)

    def visit_Try(self, node: ast.Try):
        self._check_unreachable_statements(node.body)
        for handler in node.handlers:
            self._check_unreachable_statements(handler.body)
        if node.orelse:
            self._check_unreachable_statements(node.orelse)
        if node.finalbody:
            self._check_unreachable_statements(node.finalbody)
        self.generic_visit(node)

    def _check_unreachable_statements(self, statements: List[ast.stmt]):
        terminated = False
        terminator_name = ""

        for stmt in statements:
            if terminated:
                self.diagnostics.append(
                    Diagnostic(
                        line=stmt.lineno,
                        column=stmt.col_offset + 1,
                        severity="warning",
                        category="unreachable-code",
                        message=f"Unreachable code detected after {terminator_name} statement",
                        source="python-ast",
                    )
                )
                # Flag the first unreachable statement in the block to avoid redundant diagnostics
                break

            if isinstance(stmt, ast.Return):
                terminated = True
                terminator_name = "return"
            elif isinstance(stmt, ast.Raise):
                terminated = True
                terminator_name = "raise"
            elif isinstance(stmt, ast.Break):
                terminated = True
                terminator_name = "break"
            elif isinstance(stmt, ast.Continue):
                terminated = True
                terminator_name = "continue"
            elif self._block_definitely_terminates(stmt):
                terminated = True
                terminator_name = "conditional execution"

    def _block_definitely_terminates(self, stmt: ast.stmt) -> bool:
        """Determines if a statement guaranteed terminates control flow."""
        if isinstance(stmt, (ast.Return, ast.Raise, ast.Break, ast.Continue)):
            return True

        if isinstance(stmt, ast.If):
            if not stmt.body or not stmt.orelse:
                return False
            then_term = any(self._block_definitely_terminates(s) for s in stmt.body)
            else_term = any(self._block_definitely_terminates(s) for s in stmt.orelse)
            return then_term and else_term

        return False

    def _check_function_return_paths(self, fn_node: ast.AST):
        """Checks if a function with explicit value returns can exit without returning a value."""
        body = getattr(fn_node, "body", [])
        if not body:
            return

        # Check for yield/yield from (generator functions)
        for child in ast.walk(fn_node):
            if isinstance(child, (ast.Yield, ast.YieldFrom)):
                return

        # Collect return statements inside function (excluding nested functions)
        val_returns = []
        for child in body:
            self._collect_returns(child, val_returns)

        # Filter for returns that return actual values (not bare return or return None)
        value_returning_returns = [r for r in val_returns if r.value is not None and not (isinstance(r.value, ast.Constant) and r.value.value is None)]

        if not value_returning_returns:
            return

        # If function has value returns, verify if ALL control flow paths end in return/raise
        if not self._statements_all_return(body):
            name = getattr(fn_node, "name", "function")
            self.diagnostics.append(
                Diagnostic(
                    line=fn_node.lineno,
                    column=fn_node.col_offset + 1,
                    severity="warning",
                    category="missing-return",
                    message=f"Function '{name}' may exit without returning a value",
                    source="python-ast",
                )
            )

    def _collect_returns(self, node: ast.AST, returns_list: List[ast.Return]):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            return  # Do not enter nested functions
        if isinstance(node, ast.Return):
            returns_list.append(node)
        for child in ast.iter_child_nodes(node):
            self._collect_returns(child, returns_list)

    def _statements_all_return(self, statements: List[ast.stmt]) -> bool:
        if not statements:
            return False

        for stmt in statements:
            if isinstance(stmt, (ast.Return, ast.Raise)):
                return True
            if isinstance(stmt, ast.If):
                if stmt.body and stmt.orelse:
                    if self._statements_all_return(stmt.body) and self._statements_all_return(stmt.orelse):
                        return True
            if isinstance(stmt, ast.Try):
                # Try-except ends in return only if body and all handlers return
                if self._statements_all_return(stmt.body) and all(self._statements_all_return(h.body) for h in stmt.handlers):
                    return True
        return False


def analyze_control_flow(tree: ast.AST) -> List[Diagnostic]:
    visitor = ControlFlowVisitor()
    visitor.visit(tree)
    return visitor.diagnostics
