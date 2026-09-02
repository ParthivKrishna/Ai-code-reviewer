import ast
from typing import List
from app.models.diagnostic import Diagnostic


class SuspiciousCodeVisitor(ast.NodeVisitor):
    """
    Detects deterministic suspicious AST patterns such as self-comparisons,
    constant conditions, redundant boolean comparisons, and redundant if/else return patterns.
    """

    def __init__(self):
        self.diagnostics: List[Diagnostic] = []

    def visit_Compare(self, node: ast.Compare):
        self.generic_visit(node)

        left = node.left
        for op, right in zip(node.ops, node.comparators):
            # Check self-comparison: x == x or x != x
            if self._are_nodes_equal(left, right):
                msg = "Condition compares a value with itself and may always be true" if isinstance(op, ast.Eq) else "Condition compares a value with itself"
                self.diagnostics.append(
                    Diagnostic(
                        line=node.lineno,
                        column=node.col_offset + 1,
                        severity="warning",
                        category="suspicious-condition",
                        message=msg,
                        source="python-ast",
                    )
                )

            # Check comparison to boolean literal: flag == True
            if (isinstance(left, ast.Constant) and isinstance(left.value, bool)) or (isinstance(right, ast.Constant) and isinstance(right.value, bool)):
                if isinstance(op, (ast.Eq, ast.NotEq)):
                    self.diagnostics.append(
                        Diagnostic(
                            line=node.lineno,
                            column=node.col_offset + 1,
                            severity="warning",
                            category="suspicious-boolean-comparison",
                            message="Comparison to boolean literal is redundant",
                            source="python-ast",
                        )
                    )

    def visit_If(self, node: ast.If):
        self.generic_visit(node)
        self._check_constant_condition(node.test, node.lineno, node.col_offset + 1)
        self._check_redundant_return(node)

    def visit_While(self, node: ast.While):
        self.generic_visit(node)
        self._check_constant_condition(node.test, node.lineno, node.col_offset + 1)

    def _check_constant_condition(self, test_node: ast.AST, line: int, col: int):
        if isinstance(test_node, ast.Constant) and isinstance(test_node.value, bool):
            self.diagnostics.append(
                Diagnostic(
                    line=line,
                    column=col,
                    severity="warning",
                    category="suspicious-condition",
                    message=f"Condition is a constant boolean literal '{test_node.value}'",
                    source="python-ast",
                )
            )

    def _check_redundant_return(self, node: ast.If):
        if len(node.body) == 1 and len(node.orelse) == 1:
            s1 = node.body[0]
            s2 = node.orelse[0]
            if isinstance(s1, ast.Return) and isinstance(s2, ast.Return):
                if isinstance(s1.value, ast.Constant) and isinstance(s1.value.value, bool):
                    if isinstance(s2.value, ast.Constant) and isinstance(s2.value.value, bool):
                        self.diagnostics.append(
                            Diagnostic(
                                line=node.lineno,
                                column=node.col_offset + 1,
                                severity="warning",
                                category="redundant-code",
                                message="Redundant if/else structure can be simplified",
                                source="python-ast",
                            )
                        )

    def _are_nodes_equal(self, n1: ast.AST, n2: ast.AST) -> bool:
        if type(n1) is not type(n2):
            return False
        if isinstance(n1, ast.Name) and isinstance(n2, ast.Name):
            return n1.id == n2.id
        if isinstance(n1, ast.Constant) and isinstance(n2, ast.Constant):
            return n1.value == n2.value
        if isinstance(n1, ast.Attribute) and isinstance(n2, ast.Attribute):
            return n1.attr == n2.attr and self._are_nodes_equal(n1.value, n2.value)
        return False


def analyze_suspicious_code(tree: ast.AST) -> List[Diagnostic]:
    visitor = SuspiciousCodeVisitor()
    visitor.visit(tree)
    return visitor.diagnostics
