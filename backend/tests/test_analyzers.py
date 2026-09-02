import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.analyzers.ast_analyzer import analyze_python_code

client = TestClient(app)


# ---------------------------------------------------------
# 1. Valid Code Tests (Zero False Positives)
# ---------------------------------------------------------
def test_valid_code():
    code = """
def add(a, b):
    return a + b

result = add(10, 20)
print(result)
"""
    diagnostics = analyze_python_code(code)
    assert len(diagnostics) == 0


# ---------------------------------------------------------
# 2. Syntax Errors Test
# ---------------------------------------------------------
def test_syntax_error():
    code = "def invalid_syntax("
    diagnostics = analyze_python_code(code)
    assert len(diagnostics) == 1
    assert diagnostics[0].category == "syntax"
    assert diagnostics[0].severity == "error"


# ---------------------------------------------------------
# 3. Undefined Variables Test
# ---------------------------------------------------------
def test_undefined_variable():
    code = "print(foo)"
    diagnostics = analyze_python_code(code)
    assert any(d.category == "undefined-variable" and "foo" in d.message for d in diagnostics)


# ---------------------------------------------------------
# 4. Builtins Recognition Test
# ---------------------------------------------------------
def test_builtins_recognized():
    code = """
x = len([1, 2, 3])
y = str(100)
print(x, y)
"""
    diagnostics = analyze_python_code(code)
    assert not any(d.category == "undefined-variable" for d in diagnostics)


# ---------------------------------------------------------
# 5. Function Parameters Test
# ---------------------------------------------------------
def test_function_parameters_not_unused():
    code = """
def process(data, options):
    return data
"""
    diagnostics = analyze_python_code(code)
    # Parameters 'options' should NOT be flagged as unused variable
    assert not any(d.category == "unused-variable" for d in diagnostics)


# ---------------------------------------------------------
# 6. Nested Scopes Test
# ---------------------------------------------------------
def test_nested_scopes():
    code = """
def outer():
    x = 10
    def inner():
        return x
    return inner()
"""
    diagnostics = analyze_python_code(code)
    assert not any(d.category == "undefined-variable" or d.category == "unused-variable" for d in diagnostics)


# ---------------------------------------------------------
# 7. Unused Variables Test
# ---------------------------------------------------------
def test_unused_variables():
    code = """
def calculate():
    x = 10
    y = 20
    return x
"""
    diagnostics = analyze_python_code(code)
    unused = [d for d in diagnostics if d.category == "unused-variable"]
    assert len(unused) == 1
    assert "Variable 'y'" in unused[0].message
    assert unused[0].severity == "warning"


# ---------------------------------------------------------
# 8. Ignored '_' Variables Test
# ---------------------------------------------------------
def test_ignored_underscore_variables():
    code = """
def process():
    _ = 10
    _unused_var = 20
    return 1
"""
    diagnostics = analyze_python_code(code)
    assert not any(d.category == "unused-variable" for d in diagnostics)


# ---------------------------------------------------------
# 9. Unreachable Code After Return Test
# ---------------------------------------------------------
def test_unreachable_after_return():
    code = """
def test():
    return 10
    print("hello")
"""
    diagnostics = analyze_python_code(code)
    unreachable = [d for d in diagnostics if d.category == "unreachable-code"]
    assert len(unreachable) == 1
    assert unreachable[0].line == 4


# ---------------------------------------------------------
# 10. Unreachable Code After Raise Test
# ---------------------------------------------------------
def test_unreachable_after_raise():
    code = """
def fail():
    raise ValueError("error")
    x = 1
"""
    diagnostics = analyze_python_code(code)
    unreachable = [d for d in diagnostics if d.category == "unreachable-code"]
    assert len(unreachable) == 1
    assert unreachable[0].line == 4


# ---------------------------------------------------------
# 11. Used Before Assignment Test
# ---------------------------------------------------------
def test_used_before_assignment():
    code = """
def test(condition):
    if condition:
        x = 10
    print(x)
"""
    diagnostics = analyze_python_code(code)
    uba = [d for d in diagnostics if d.category == "used-before-assignment"]
    assert len(uba) == 1
    assert "Variable 'x' may be used before assignment" in uba[0].message
    assert uba[0].severity == "warning"


# ---------------------------------------------------------
# 12. Function Argument Count Test
# ---------------------------------------------------------
def test_function_argument_count():
    code = """
def add(a, b):
    return a + b

add(10)
add(10, 20, 30)
"""
    diagnostics = analyze_python_code(code)
    arg_errs = [d for d in diagnostics if d.category == "argument-count"]
    assert len(arg_errs) == 2
    assert arg_errs[0].severity == "error"


# ---------------------------------------------------------
# 13. Default Arguments Test
# ---------------------------------------------------------
def test_default_arguments():
    code = """
def greet(name, msg="Hello"):
    return f"{msg}, {name}"

greet("Alice")
greet("Bob", "Hi")
"""
    diagnostics = analyze_python_code(code)
    assert not any(d.category == "argument-count" for d in diagnostics)


# ---------------------------------------------------------
# 14. Keyword Arguments and *args Test
# ---------------------------------------------------------
def test_keyword_and_varargs():
    code = """
def log(msg, *args):
    print(msg, args)

log("info", 1, 2, 3)
"""
    diagnostics = analyze_python_code(code)
    assert not any(d.category == "argument-count" for d in diagnostics)


# ---------------------------------------------------------
# 15. Missing Return Paths Test
# ---------------------------------------------------------
def test_missing_return_paths():
    code = """
def get_number(condition):
    if condition:
        return 10
"""
    diagnostics = analyze_python_code(code)
    ret_errs = [d for d in diagnostics if d.category == "missing-return"]
    assert len(ret_errs) == 1
    assert "get_number" in ret_errs[0].message


# ---------------------------------------------------------
# 16. Suspicious Conditions Test
# ---------------------------------------------------------
def test_suspicious_conditions():
    code = """
def check(x, flag):
    if x == x:
        pass
    while False:
        pass
    if flag == True:
        pass
"""
    diagnostics = analyze_python_code(code)
    suspicious = [d for d in diagnostics if d.category in {"suspicious-condition", "suspicious-boolean-comparison"}]
    assert len(suspicious) >= 3


# ---------------------------------------------------------
# 17. eval() Security Test
# ---------------------------------------------------------
def test_security_eval():
    code = "eval('1 + 1')"
    diagnostics = analyze_python_code(code)
    sec = [d for d in diagnostics if d.category == "security"]
    assert len(sec) == 1
    assert "eval" in sec[0].message


# ---------------------------------------------------------
# 18. exec() Security Test
# ---------------------------------------------------------
def test_security_exec():
    code = "exec('x = 1')"
    diagnostics = analyze_python_code(code)
    sec = [d for d in diagnostics if d.category == "security"]
    assert len(sec) == 1
    assert "exec" in sec[0].message


# ---------------------------------------------------------
# 19. os.system() Security Test
# ---------------------------------------------------------
def test_security_os_system():
    code = """
import os
os.system('ls')
"""
    diagnostics = analyze_python_code(code)
    sec = [d for d in diagnostics if d.category == "security"]
    assert len(sec) == 1
    assert "os.system" in sec[0].message


# ---------------------------------------------------------
# 20. subprocess shell=True Security Test
# ---------------------------------------------------------
def test_security_subprocess_shell():
    code = """
import subprocess
subprocess.run('ls', shell=True)
"""
    diagnostics = analyze_python_code(code)
    sec = [d for d in diagnostics if d.category == "security"]
    assert len(sec) == 1
    assert "shell=True" in sec[0].message


# ---------------------------------------------------------
# API Endpoints Backward Compatibility Tests
# ---------------------------------------------------------
def test_api_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "CodeGuard"


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_api_analyze_valid():
    response = client.post("/api/analyze", json={"language": "python", "code": "x = 10\nprint(x)"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["diagnostics"] == []


def test_api_analyze_with_warnings():
    response = client.post("/api/analyze", json={"language": "python", "code": "eval('1+1')"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert len(data["diagnostics"]) > 0
    assert data["diagnostics"][0]["category"] == "security"


def test_api_analyze_unsupported_language():
    response = client.post("/api/analyze", json={"language": "javascript", "code": "console.log('hi')"[:100]})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert data["diagnostics"] == []


# ---------------------------------------------------------
# Extra Edge Case Tests
# ---------------------------------------------------------
def test_unreachable_after_break():
    code = """
for i in range(10):
    if i == 5:
        break
        print("unreachable break")
"""
    diagnostics = analyze_python_code(code)
    unreachable = [d for d in diagnostics if d.category == "unreachable-code"]
    assert len(unreachable) == 1
    assert "break" in unreachable[0].message


def test_unreachable_after_continue():
    code = """
while True:
    continue
    print("unreachable continue")
"""
    diagnostics = analyze_python_code(code)
    unreachable = [d for d in diagnostics if d.category == "unreachable-code"]
    assert len(unreachable) == 1
    assert "continue" in unreachable[0].message


def test_class_definition_scope():
    code = """
class Calculator:
    def add(self, a, b):
        return a + b

calc = Calculator()
res = calc.add(1, 2)
print(res)
"""
    diagnostics = analyze_python_code(code)
    assert len(diagnostics) == 0

