/**
 * api.js  –  Thin HTTP wrapper around the FastAPI backend.
 *
 * Every function here mirrors one POST/GET route in main.py.
 * BASE_URL can be overridden via the REACT_APP_API_URL env variable.
 */

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

/**
 * Send pseudocode to the LLM and receive an abstract Instruction Set.
 *
 * @param {string} pseudocode   – free-text algorithm description
 * @param {string} [algoName]   – optional hint ("dijkstra", "bfs", …)
 * @returns {Promise<Array>}    – Instruction Set array
 */
export async function analyzePseudocode(pseudocode, algoName = "") {
    const res = await fetch(`${BASE_URL}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pseudocode, algorithm_name: algoName }),
    });
    if (!res.ok) throw new Error(`analyze failed: ${res.status}`);
    const data = await res.json();
    return data.instructions; // array
}

/**
 * Synthesise text into MP3 audio via the backend TTS endpoint.
 *
 * @param {string} text
 * @param {"vi"|"en"} [lang="vi"]
 * @returns {Promise<string>}  – base-64 MP3 string
 */
export async function synthesizeSpeech(text, lang = "vi") {
    const res = await fetch(`${BASE_URL}/tts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang }),
    });
    if (!res.ok) throw new Error(`tts failed: ${res.status}`);
    const data = await res.json();
    return data.audio_base64;
}

/**
 * Quick health-check against the backend.
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
    try {
        const res = await fetch(`${BASE_URL}/health`);
        return res.ok;
    } catch {
        return false;
    }
}