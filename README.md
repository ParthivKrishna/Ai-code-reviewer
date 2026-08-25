# CodeGuard

**Real-time AI-powered code analysis that helps developers catch errors and potential logic issues while writing code — before compilation or execution.**

## 🚀 About

CodeGuard is a developer-focused coding assistant designed to act as a **real-time second pair of eyes** while programming.

Instead of primarily generating code, CodeGuard focuses on analyzing the code written by the developer and providing immediate feedback about:

- Syntax errors
- Static analysis issues
- Type-related problems
- Potential logic errors
- Possible edge cases
- Suspicious code patterns

The goal is to help developers **identify and understand problems before running their code**.

## 🎯 Project Goal

Most coding assistants focus heavily on generating or completing code.

CodeGuard takes a different approach:

> **"Don't write my code. Watch my code."**

The system combines traditional static-analysis tools with AI-based reasoning to provide fast and useful feedback while the developer is writing code.

## 🏗️ Planned Architecture

```text
Developer
    │
    ▼
Monaco Editor
    │
    ▼
Real-time Code Changes
    │
    ▼
FastAPI Backend
    │
    ├───────────────┐
    ▼               ▼
Python AST       Static Analysis
                 (Ruff / Pyright)
    │               │
    └───────┬───────┘
            ▼
       AI Analysis
            │
            ▼
     Diagnostic Engine
            │
            ▼
      Monaco Editor
            │
            ▼
      Developer Feedback