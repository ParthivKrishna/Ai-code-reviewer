from fastapi import FastAPI
from pydantic import BaseModel
from app.analyzers.ast_analyzer import analyze_python_code
from app.models.diagnostic import Diagnostic

app = FastAPI(
    title="CodeGuard API",
    description="Backend for the CodeGuard real-time AI coding assistant",
    version="0.1.0",
)

class AnalyzeRequest(BaseModel):
    language: str
    code: str


class AnalyzeResponse(BaseModel):
    success: bool
    diagnostics: list[Diagnostic]


@app.get("/")
def root():
    return {
        "name": "CodeGuard",
        "status": "online",
        "version": "0.1.0",
    }


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.post("/api/analyze", response_model=AnalyzeResponse)
def analyze_code(request: AnalyzeRequest):

    if request.language.lower() != "python":
        return AnalyzeResponse(
            success=False,
            diagnostics=[]
        )

    diagnostics = analyze_python_code(request.code)

    return AnalyzeResponse(
        success=len(diagnostics) == 0,
        diagnostics=diagnostics
    )
