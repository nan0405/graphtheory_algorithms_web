"""
llm_service.py  –  Calls OpenAI GPT-4 with an engineered prompt.

The prompt is designed so that:
  • LLM does NOT assume any specific graph topology.
  • Output is a list of ABSTRACT actions the frontend can map onto any graph.
  • Each action carries: step number, highlightLine key, action type, colour, voice text.
"""
import json, os
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ─── Master Prompt Template ────────────────────────────────────────────────
SYSTEM_PROMPT = """Bạn là AI chuyên phân tích thuật toán đồ thị.

Nhiệm vụ của bạn:
• Đọc đoạn mã giả do người dùng cung cấp.
• Hiểu logic của thuật toán.
• Không giả định đồ thị cụ thể — chỉ sinh ra các ACTION trừu tượng.
• Frontend sẽ tự map các action đó lên đồ thị thực tế.

Hãy trả về kết quả dưới dạng JSON array hợp lệ theo format sau.
Chỉ trả về JSON – không giải thích thêm, không bao gồm markdown code-fence.

[
  {
    "step": 1,
    "highlightLine": "<key>",
    "action": "<ACTION_TYPE>",
    "color": "<optional hex>",
    "voice": "<Vietnamese explanation for TTS>"
  },
  …
]

ACTION_TYPE có thể là:
  INIT_ALGORITHM   – khởi tạo
  COLOR_NODE       – tô màu đỉnh (kèm "color")
  COLOR_EDGE       – tô màu cạnh (kèm "color")
  PERSIST_NODE     – chốt đỉnh (blue, không đổi)
  PERSIST_EDGE     – chốt cạnh (blue, không đổi)
  RELAX_EDGE       – thử cập nhật cạnh
  RESET_TEMP       – xóa màu tạm
  FINAL_PATH       – hiệu ứng kết thúc

highlightLine key mẫu:
  init, init-close, init-dist, init-start, init-open,
  loop, pick-min, add-close, for,
  if1, if11, if12, if13, if2, if21, if22, if23,
  end-loop, dequeue, enqueue, pop, push, mark, if-visit.
"""

# ─── Colour palette (consistent with frontend) ─────────────────────────────
COLOURS = {
    "considering": "#ffc107",
    "examining":   "#e53935",
    "updated":     "#00e676",
    "finalised":   "#1976d2",
}


async def analyze_pseudocode(pseudocode: str, algorithm_name: str = "") -> list[dict]:
    """
    Send pseudocode to GPT-4, receive abstract Instruction Set.
    """
    user_msg = pseudocode
    if algorithm_name:
        user_msg = f"[Algorithm: {algorithm_name}]\n\n{pseudocode}"

    response = await client.messages.create(
        model="gpt-4o",
        max_tokens=2000,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": user_msg},
        ]
    )

    raw = response.choices[0].message.content.strip()
    # strip possible markdown fences just in case
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        instructions = json.loads(raw)
    except json.JSONDecodeError:
        instructions = [{"step": 1, "action": "INIT_ALGORITHM", "voice": "Không thể phân tích mã giả."}]

    return instructions