import ast
from typing import List, Dict, Optional, Set
from app.models.diagnostic import Diagnostic


class FunctionSignature:

    def __init__(self, node: ast.AST):
        self.name = getattr(node, "name", "")
        self.line = node.lineno
        self.col = node.col_offset + 1

        args = node.args
        self.posonlyargs = [a.arg for a in args.posonlyargs]
        self.args = [a.arg for a in args.args]
        self.kwonlyargs = [a.arg for a in args.kwonlyargs]

        self.has_varargs = args.vararg is not None
        self.has_varkw = args.kwarg is not None

        # Positional arguments total count
        all_pos = self.posonlyargs + self.args
        self.total_pos_params = len(all_pos)
        self.pos_param_names = set(all_pos)

        # Defaults for positional arguments apply from right to left of self.args
        defaults_count = len(args.defaults)
        self.min_pos_params = self.total_pos_params - defaults_count

        # Keyword-only defaults
        self.kwonly_defaults = set()
        for param, default in zip(self.kwonlyargs, args.kw_defaults):
            if default is not None:
                self.kwonly_defaults.add(param)
        self.required_kwonly = set(self.kwonlyargs) - self.kwonly_defaults


class FunctionAnalyzerVisitor(ast.NodeVisitor):
    """
    Tracks local function definitions and validates argument counts and keywords at call sites.
    """

    def __init__(self):
        self.functions: Dict[str, FunctionSignature] = {}
        self.diagnostics: List[Diagnostic] = []

    def visit_FunctionDef(self, node: ast.FunctionDef):
        self.functions[node.name] = FunctionSignature(node)
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        self.functions[node.name] = FunctionSignature(node)
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        self.generic_visit(node)

        # Only analyze direct function calls where function is a simple name
        if not isinstance(node.func, ast.Name):
            return

        fn_name = node.func.id
        if fn_name not in self.functions:
            return

        sig = self.functions[fn_name]

        # Check for starred unpackings (*args, **kwargs) in call
        has_star_args = any(isinstance(arg, ast.Starred) for arg in node.args)
        has_double_star = any(kw.arg is None for kw in node.keywords)

        if has_star_args or has_double_star:
            # Dynamic argument unpacking present, skip exact static count validation
            return

        num_pos_given = len(node.args)
        kw_given = {kw.arg for kw in node.keywords if kw.arg is not None}
        num_kw_given = len(kw_given)

        # Positional args supplied as keywords
        pos_by_kw = kw_given & sig.pos_param_names
        total_pos_provided = num_pos_given + len(pos_by_kw)

        # Validate minimum positional arguments
        if not sig.has_varargs and total_pos_provided < sig.min_pos_params:
            expected_str = f"{sig.min_pos_params}" if sig.min_pos_params == sig.total_pos_params else f"at least {sig.min_pos_params}"
            self.diagnostics.append(
                Diagnostic(
                    line=node.lineno,
                    column=node.col_offset + 1,
                    severity="error",
                    category="argument-count",
                    message=f"Function '{fn_name}' expects {expected_str} arguments but {total_pos_provided} was given" if total_pos_provided == 1 else f"Function '{fn_name}' expects {expected_str} arguments but {total_pos_provided} were given",
                    source="python-ast",
                )
            )
            return

        # Validate maximum positional arguments
        if not sig.has_varargs and num_pos_given > sig.total_pos_params:
            expected_str = f"{sig.total_pos_params}" if sig.min_pos_params == sig.total_pos_params else f"at most {sig.total_pos_params}"
            self.diagnostics.append(
                Diagnostic(
                    line=node.lineno,
                    column=node.col_offset + 1,
                    severity="error",
                    category="argument-count",
                    message=f"Function '{fn_name}' expects {expected_str} arguments but {num_pos_given} was given" if num_pos_given == 1 else f"Function '{fn_name}' expects {expected_str} arguments but {num_pos_given} were given",
                    source="python-ast",
                )
            )
            return


def analyze_function_calls(tree: ast.AST) -> List[Diagnostic]:
    visitor = FunctionAnalyzerVisitor()
    visitor.visit(tree)
    return visitor.diagnostics
