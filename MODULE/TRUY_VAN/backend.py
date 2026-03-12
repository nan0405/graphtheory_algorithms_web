from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import json

from parser_module import QueryParser
from engine import QueryEngine

app = FastAPI()

# Load KB
with open("knowledge_base.json", "r", encoding="utf-8") as f:
    kb = json.load(f)

parser = QueryParser(kb)
engine = QueryEngine(kb)

class QueryRequest(BaseModel):
    question: str

@app.post("/query")
def query_api(request: QueryRequest):
    parsed = parser.parse(request.question)
    result = engine.execute(parsed)
    return {
        "parsed": parsed,
        "results": result
    }

app.mount("/", StaticFiles(directory="static", html=True), name="static")