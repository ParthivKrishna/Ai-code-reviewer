import ast
import builtins

from app.models.diagnostic import Diagnostic
from app.analyzers.scope import Scope, VariableScopeVisitor, BUILTINS
from app.analyzers.control_flow import analyze_control_flow
from app.analyzers.function_analyzer import analyze_function_calls
from app.analyzers.suspicious_code import analyze_suspicious_code
from app.analyzers.security_analyzer import analyze_security

# Backwards compatibility alias
UndefinedVariableVisitor = VariableScopeVisitor


def analyze_python_code(code: str) -> list[Diagnostic]:
    """
    Orchestrates AST parsing and all deterministic Python static analyzers:
    1. Syntax Error Detection
    2. Scope Analysis (Undefined variables, Used-before-assignment, Unused variables)
    3. Control Flow Analysis (Unreachable code, Return path validation)
    4. Function Call & Argument Analysis
    5. Suspicious Code Patterns
    6. Security Vulnerability Checks
    """
    diagnostics: list[Diagnostic] = []

    # -----------------------------
    # 1. Syntax analysis
    # -----------------------------
    try:
        tree = ast.parse(code)
    except SyntaxError as error:
        diagnostics.append(
            Diagnostic(
                line=error.lineno or 1,
                column=error.offset or 1,
                severity="error",
                category="syntax",
                message=error.msg,
                source="python-ast",
            )
        )
        return diagnostics

    # -----------------------------
    # 2. Scope & Variable Analysis
    # -----------------------------
    scope_visitor = VariableScopeVisitor()
    scope_visitor.visit(tree)
    scope_visitor.check_global_unused()
    diagnostics.extend(scope_visitor.diagnostics)

    # -----------------------------
    # 3. Control Flow Analysis
    # -----------------------------
    control_flow_diagnostics = analyze_control_flow(tree)
    diagnostics.extend(control_flow_diagnostics)

    # -----------------------------
    # 4. Function Call & Argument Analysis
    # -----------------------------
    function_diagnostics = analyze_function_calls(tree)
    diagnostics.extend(function_diagnostics)

    # -----------------------------
    # 5. Suspicious Code Patterns
    # -----------------------------
    suspicious_diagnostics = analyze_suspicious_code(tree)
    diagnostics.extend(suspicious_diagnostics)

    # -----------------------------
    # 6. Basic Security Analysis
    # -----------------------------
    security_diagnostics = analyze_security(tree)
    diagnostics.extend(security_diagnostics)

    # Sort diagnostics by line and column for deterministic output
    diagnostics.sort(key=lambda d: (d.line, d.column, d.category))

    return diagnostics