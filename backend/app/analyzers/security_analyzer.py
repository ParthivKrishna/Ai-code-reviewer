import ast
from typing import List
from app.models.diagnostic import Diagnostic


class SecurityAnalyzerVisitor(ast.NodeVisitor):
    """
    Detects basic Python security risks such as eval(), exec(), os.system(),
    and subprocess invocation with shell=True.
    """

    def __init__(self):
        self.diagnostics: List[Diagnostic] = []

    def visit_Call(self, node: ast.Call):
        self.generic_visit(node)

        # 1. Check eval() and exec()
        if isinstance(node.func, ast.Name):
            fn_name = node.func.id
            if fn_name == "eval":
                self.diagnostics.append(
                    Diagnostic(
                        line=node.lineno,
                        column=node.col_offset + 1,
                        severity="warning",
                        category="security",
                        message="Avoid eval() with untrusted input because it can execute arbitrary Python code.",
                        source="python-ast",
                    )
                )
            elif fn_name == "exec":
                self.diagnostics.append(
                    Diagnostic(
                        line=node.lineno,
                        column=node.col_offset + 1,
                        severity="warning",
                        category="security",
                        message="Avoid exec() because it can execute arbitrary Python code.",
                        source="python-ast",
                    )
                )

        # 2. Check os.system()
        if isinstance(node.func, ast.Attribute):
            if node.func.attr == "system" and isinstance(node.func.value, ast.Name) and node.func.value.id == "os":
                self.diagnostics.append(
                    Diagnostic(
                        line=node.lineno,
                        column=node.col_offset + 1,
                        severity="warning",
                        category="security",
                        message="Avoid os.system(); consider subprocess with explicit argument lists to prevent shell injection.",
                        source="python-ast",
                    )
                )

        # 3. Check subprocess calls with shell=True
        is_subprocess_call = False
        if isinstance(node.func, ast.Attribute):
            if isinstance(node.func.value, ast.Name) and node.func.value.id == "subprocess":
                is_subprocess_call = True
        elif isinstance(node.func, ast.Name):
            if node.func.id in {"Popen", "run", "call", "check_output", "check_call"}:
                is_subprocess_call = True

        if is_subprocess_call:
            for kw in node.keywords:
                if kw.arg == "shell":
                    if isinstance(kw.value, ast.Constant) and kw.value.value is True:
                        self.diagnostics.append(
                            Diagnostic(
                                line=node.lineno,
                                column=node.col_offset + 1,
                                severity="warning",
                                category="security",
                                message="Using shell=True in subprocess calls can lead to shell injection vulnerabilities.",
                                source="python-ast",
                            )
                        )


def analyze_security(tree: ast.AST) -> List[Diagnostic]:
    visitor = SecurityAnalyzerVisitor()
    visitor.visit(tree)
    return visitor.diagnostics
