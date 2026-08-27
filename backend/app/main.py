from fastapi import FastAPI

app = FastAPI(
    title="CodeGuard API",
    description="Backend for the CodeGuard real-time AI coding assistant",
    version="0.1.0",
)


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