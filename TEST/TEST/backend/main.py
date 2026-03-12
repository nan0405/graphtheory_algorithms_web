"""
main.py  –  FastAPI entry-point
Run: uvicorn main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from llm_service import analyze_pseudocode
from tts import synthesize

# ─── App ────────────────────────────────────────────────────────────────────
app = FastAPI(title="Graph Algorithm AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ─────────────────────────────────────────────────────────────────
class AnalyzeRequest(BaseModel):
    pseudocode: str               # free-text pseudocode (any language)
    algorithm_name: str = ""      # optional hint: "dijkstra", "bfs", …

class TTSRequest(BaseModel):
    text: str
    lang: str = "vi"              # "vi" | "en"

# ─── Routes ─────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/analyze")
async def analyze(req: AnalyzeRequest):
    """
    Frontend sends pseudocode → LLM returns abstract Instruction Set JSON.
    The JSON contains only ABSTRACT actions (no concrete node/edge ids)
    so it can be mapped onto any user-drawn graph by the frontend.
    """
    instructions = await analyze_pseudocode(req.pseudocode, req.algorithm_name)
    return {"instructions": instructions}

@app.post("/tts")
async def tts(req: TTSRequest):
    """
    Synthesise Vietnamese / English speech and return base-64 audio.
    """
    audio_b64 = await synthesize(req.text, req.lang)
    return {"audio_base64": audio_b64, "mime": "audio/mp3"}