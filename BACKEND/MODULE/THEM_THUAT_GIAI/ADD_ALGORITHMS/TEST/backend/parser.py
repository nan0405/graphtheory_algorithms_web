"""
parser.py  –  Validates and normalises the Instruction Set JSON
              that the LLM returns before it is sent to the frontend.
"""
from typing import Any

VALID_ACTIONS = {
    "INIT_ALGORITHM",
    "COLOR_NODE",
    "COLOR_EDGE",
    "PERSIST_NODE",
    "PERSIST_EDGE",
    "RELAX_EDGE",
    "RESET_TEMP",
    "FINAL_PATH",
}


def validate_and_fix(instructions: list[dict]) -> list[dict]:
    """
    Walk through every step and:
      • ensure required keys exist (step, action)
      • coerce types
      • strip unknown action names → INIT_ALGORITHM as fallback
      • add default voice if missing
    Returns a clean list ready for the frontend.
    """
    cleaned: list[dict] = []
    for i, item in enumerate(instructions, start=1):
        if not isinstance(item, dict):
            continue

        step: dict[str, Any] = {}

        # ── step number ──
        step["step"] = item.get("step", i)

        # ── highlightLine ──
        step["highlightLine"] = item.get("highlightLine", "init")

        # ── action ──
        raw_action = str(item.get("action", "INIT_ALGORITHM")).upper()
        step["action"] = raw_action if raw_action in VALID_ACTIONS else "INIT_ALGORITHM"

        # ── colour (only for colour actions) ──
        if "color" in item and item["color"]:
            step["color"] = str(item["color"])

        # ── voice / explanation ──
        step["voice"] = item.get("voice", item.get("explain", f"Bước {step['step']}"))

        cleaned.append(step)

    return cleaned