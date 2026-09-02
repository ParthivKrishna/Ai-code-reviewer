from pydantic import BaseModel
from typing import Literal


class Diagnostic(BaseModel):
    line: int
    column: int
    severity: Literal["error", "warning", "info"]
    category: str
    message: str
    source: str