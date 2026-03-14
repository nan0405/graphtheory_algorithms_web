# Graph Algorithm AI Visualizer

An AI-powered system that **automatically animates any graph algorithm** from pseudocode.  
A professor types pseudocode → Claude / GPT-4 understands the logic → the frontend runs a step-by-step animated visualization on a user-drawn graph.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser (React + D3.js)                                     │
│                                                              │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────────┐   │
│  │  Graph      │   │  Pseudocode  │   │  Step Controller│   │
│  │  Canvas     │◄──│  Panel       │◄──│  (play/pause)   │   │
│  │  (D3.js)    │   │              │   │                 │   │
│  └──────┬──────┘   └──────────────┘   └────────┬────────┘   │
│         │                                      │             │
│         └──────────────────────────────────────┘             │
│                          │                                   │
│                     POST /analyze                            │
└──────────────────────────┼───────────────────────────────────┘
                           ▼
┌──────────────────────────────────────────────────────────────┐
│  Backend (FastAPI)                                           │
│                                                              │
│  main.py  →  llm_service.py  →  OpenAI / Claude API         │
│                     ↓                                        │
│              parser.py  (validate JSON)                      │
│                     ↓                                        │
│              tts.py  (optional TTS audio)                    │
└──────────────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision | Why |
|---|---|
| LLM receives **only pseudocode** (no graph) | Graph is user-drawn; LLM must understand the *algorithm*, not a specific instance |
| LLM output is **abstract actions** | Frontend maps actions onto any graph topology at runtime |
| Colour conventions are **hardcoded** in both prompt + frontend | Ensures visual consistency regardless of which algorithm runs |
| `dijkstra_ai.html` is a **single-file standalone** version | Zero dependencies — open in any browser, no build step needed |

---

## Quick Start — Standalone HTML (Recommended for demo)

> Uses the **Anthropic Claude API** directly from the browser.  
> No backend needed.

```bash
# 1. Download the standalone file
cp dijkstra_ai.html ~/Desktop/

# 2. Open in Chrome / Firefox
open ~/Desktop/dijkstra_ai.html
```

The file calls `https://api.anthropic.com/v1/messages` directly.  
API authentication is handled by the Claude.ai artifact sandbox automatically.

### How to use

1. **Draw your graph** — use "Create Graph" to add/remove nodes & edges, or keep the default 6-node graph.
2. **Pick an algorithm** — Dijkstra / BFS / DFS / Prim / Kruskal from the dropdown.
3. **Set Start (and optionally End) node** — type a single letter.
4. **Press ▶** — the AI analyses the pseudocode, computes the correct step sequence on your exact graph, and starts animating.
5. **Use ⏮ ⏸ ⏭** to step through manually.
6. **👀** button opens the pseudocode + step panel on the right.
7. **🔊 Voice** toggle reads each step aloud (uses browser Web Speech API).

---

## Full-Stack Setup (Backend + React)

### Prerequisites

| Tool | Version |
|---|---|
| Python | ≥ 3.10 |
| Node.js | ≥ 18 |
| API key | `OPENAI_API_KEY` **or** Anthropic key |

### 1. Backend

```bash
cd project/backend

# create a virtual environment
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# install
pip install -r requirements.txt

# set your key
export OPENAI_API_KEY="sk-…"       # or use a .env file

# run
uvicorn main:app --reload --port 8000
```

Test:
```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### 2. Frontend

```bash
cd project/frontend

npm install
REACT_APP_API_URL=http://localhost:8000 npm start
# opens http://localhost:3000
```

### 3. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `OPENAI_API_KEY` | backend `.env` | OpenAI GPT-4 calls |
| `TTS_BACKEND` | backend `.env` | `"openai"` (default) or `"google"` |
| `GOOGLE_APPLICATION_CREDENTIALS` | backend `.env` | Path to GCP service-account JSON (if Google TTS) |
| `REACT_APP_API_URL` | frontend `.env` | Backend base URL |

---

## Prompt Engineering

The master prompt lives in **`llm_service.py` → `SYSTEM_PROMPT`** (for the FastAPI path) and in **`dijkstra_ai.html` → `buildPrompt()`** (for the standalone path).

Key sections of the prompt:

```
1. ROLE        – "You are an expert graph-algorithm animator"
2. CONSTRAINT  – "Do NOT assume any specific graph"  (abstract actions only)
3. OUTPUT FMT  – Strict JSON schema with step / highlightLine / action / color / voice
4. ACTION TYPES – INIT_ALGORITHM | COLOR_NODE | COLOR_EDGE | PERSIST_NODE | …
5. COLOUR MAP  – Hardcoded hex values matching the frontend legend
6. ALGORITHM-SPECIFIC HINTS
     Dijkstra  → use "Append(Close,…)" phrasing so blue-persist fires
     BFS/DFS   → use "đánh dấu" / "chưa thăm"
     Prim/Kruskal → persist MST edges/nodes
7. CLOSING     – "Return ONLY the JSON array"
```

### Why these specific Vietnamese phrases?

The `applyStepVisuals()` function uses **string-matching** on `step.Pseudo` to trigger colour animations (inherited from the original Dijkstra system).  
The prompt instructs the LLM to include these trigger phrases so the existing animation rules fire correctly — no `if/else` per algorithm needed.

---

## Example Run — Dijkstra on the default graph

**Graph:**
```
A──42──B    A──4──C    A──10──D
B──14──E    B──3──F    C──3──D
D──1──E     E──11──F   D──10──F   C──5──F
```

**Start:** A → **End:** F

**Expected shortest path:** A → C → D → E → F  (cost = 4+3+1+11 = 19)  
  …or A → C → F (cost = 4+5 = 9) ← actual shortest.

The AI will return ~20 steps. First few:

```json
[
  { "Step":"1.1", "Pseudo":"Close := {}", "action":"INIT_ALGORITHM", "highlightLine":"init-close",
    "StateT":"{}",  "StateDist":"{ a:0, b:∞, c:∞, d:∞, e:∞, f:∞ }", … },
  { "Step":"1.3", "Pseudo":"Dist[A] = 0", "action":"COLOR_NODE", "color":"#00e676",
    "Highlight":{"Nodes":["a"],"Edges":[]}, "highlightLine":"init-start", … },
  { "Step":"2.1", "Pseudo":"t := get(min(Dist[Open])) := A", "action":"COLOR_NODE", "color":"#ffc107",
    "Highlight":{"Nodes":["a"],"Edges":[]}, "highlightLine":"pick-min", … },
  { "Step":"2.2", "Pseudo":"Append(Close, A)", "action":"PERSIST_NODE",
    "Highlight":{"Nodes":["a"],"Edges":[]}, "highlightLine":"add-close", … },
  …
  { "Step":"3.0", "Pseudo":"Kết quả: A → C → F, Dist = 9", "action":"FINAL_PATH", … }
]
```

---

## Supported Algorithms

| Algorithm | What the visualizer shows |
|---|---|
| **Dijkstra** | Open/Close sets, distance relaxation, shortest path |
| **BFS** | Queue, visited order, level-by-level traversal |
| **DFS** | Stack, visited order, backtracking |
| **Prim** | Growing MST, edge selection by weight |
| **Kruskal** | Sorted edges, Union-Find merges, MST construction |

> All logic is handled by the LLM — **no hardcoded algorithm code** in the frontend or backend.

---

## File Structure

```
project/
├── backend/
│   ├── main.py              # FastAPI routes
│   ├── llm_service.py       # Prompt + OpenAI call
│   ├── parser.py            # JSON validator
│   ├── tts.py               # Text-to-Speech (OpenAI or Google)
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── App.js           # Root — wires everything
│   │   ├── GraphVisualizer.js  # D3 canvas (imperative ref API)
│   │   ├── PseudocodePanel.js  # Highlight panel
│   │   ├── StepController.js   # Play/pause/step logic
│   │   └── api.js           # HTTP client → backend
│   └── package.json
│
├── dijkstra_ai.html         # ★ STANDALONE single-file version (start here)
└── README.md                # this file
```

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Lỗi: Không thể gọi AI" | Check API key is set; network must reach `api.anthropic.com` |
| Steps array is empty | The LLM returned invalid JSON — check browser console for the raw response |
| Colours don't match | Ensure `buildPrompt` colour hex values match the CSS legend |
| Voice doesn't work | Web Speech API requires a user gesture first; click ▶ then toggle voice |
| Graph nodes don't move | Force simulation may have stopped — reload the page |

---

*Built with D3.js, React, FastAPI, and Claude / GPT-4.*