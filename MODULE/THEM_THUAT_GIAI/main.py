"""main.py – Flask Application Entry Point. Run: python3 app/main.py"""
import os, sys, json, traceback
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory

sys.path.insert(0, str(Path(__file__).parent.parent))
from app.core.interpreter import Interpreter, AlgorithmNotFound
from app.core.parser import ParseError

_ROOT = Path(__file__).parent.parent
app = Flask(__name__,
    static_folder=str(_ROOT / "static"),
    template_folder=str(_ROOT / "templates"),
)
ALGORITHMS_DIR = Path(os.environ.get("ALGORITHMS_DIR", str(_ROOT / "app" / "algorithms")))
interpreter = Interpreter(algorithms_dir=str(ALGORITHMS_DIR))

@app.after_request
def add_cors(resp):
    resp.headers["Access-Control-Allow-Origin"] = "*"
    resp.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,DELETE,OPTIONS"
    resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return resp

@app.route("/", methods=["OPTIONS"])
@app.route("/<path:p>", methods=["OPTIONS"])
def options(p=None): return "", 204

@app.route("/")
def page_vis(): return send_from_directory(app.template_folder, "visualization.html")

@app.route("/admin")
def page_admin(): return send_from_directory(app.template_folder, "admin.html")

@app.route("/api/algorithm/list")
def api_list(): return jsonify({"algorithms": interpreter.list_algorithms()})

@app.route("/api/algorithm/run", methods=["POST"])
def api_run():
    d = request.get_json(force=True)
    aname = d.get("algorithmName")
    gdata = d.get("graph", {})
    start = d.get("startNode")
    end   = d.get("endNode")
    if not aname: return jsonify({"detail":"algorithmName required"}), 400
    if not start or start not in gdata.get("nodes", []):
        return jsonify({"detail": f"startNode '{start}' not in graph"}), 400
    try:
        steps = interpreter.run(algorithm_name=aname, graph_data=gdata, start=start, end=end)
    except AlgorithmNotFound as e: return jsonify({"detail": str(e)}), 404
    except ParseError as e:        return jsonify({"detail": f"Parse: {e}"}), 422
    except Exception as e:
        traceback.print_exc(); return jsonify({"detail": f"Runtime: {e}"}), 500
    return jsonify({"algorithmName": aname, "totalSteps": len(steps), "steps": steps})

@app.route("/api/admin/algorithms")
def adm_list():
    algs = []
    for f in sorted(ALGORITHMS_DIR.glob("*.json")):
        try:
            dsl = json.loads(f.read_text("utf-8"))
            algs.append({"name": f.stem, "description": dsl.get("description","")})
        except: pass
    return jsonify({"algorithms": algs})

@app.route("/api/admin/algorithms/<alg_name>")
def adm_get(alg_name):
    path = ALGORITHMS_DIR / f"{alg_name}.json"
    if not path.exists(): return jsonify({"detail": f"'{alg_name}' not found"}), 404
    return jsonify(json.loads(path.read_text("utf-8")))

@app.route("/api/admin/algorithms", methods=["POST"])
def adm_create():
    d = request.get_json(force=True)
    name = d.get("name","").strip()
    if not name: return jsonify({"detail":"name required"}), 400
    path = ALGORITHMS_DIR / f"{name}.json"
    if path.exists(): return jsonify({"detail":f"'{name}' exists, use PUT"}), 409
    _save(name, d, path)
    return jsonify({"status":"created","name":name}), 201

@app.route("/api/admin/algorithms/<alg_name>", methods=["PUT"])
def adm_update(alg_name):
    d = request.get_json(force=True)
    _save(alg_name, d, ALGORITHMS_DIR / f"{alg_name}.json")
    return jsonify({"status":"updated","name":alg_name})

@app.route("/api/admin/algorithms/<alg_name>", methods=["DELETE"])
def adm_delete(alg_name):
    path = ALGORITHMS_DIR / f"{alg_name}.json"
    if not path.exists(): return jsonify({"detail": f"'{alg_name}' not found"}), 404
    path.unlink()
    return jsonify({"status":"deleted","name":alg_name})

def _save(name, data, path):
    obj = {"name":name, "description":data.get("description",""),
           "init":data.get("init",{}), "program":data.get("program",{})}
    ALGORITHMS_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), "utf-8")

@app.route("/health")
def health(): return jsonify({"status":"ok"})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"\n🚀  Graph Algorithm AST Runtime Platform")
    print(f"    Visualization → http://localhost:{port}/")
    print(f"    Admin         → http://localhost:{port}/admin\n")
    app.run(host="0.0.0.0", port=port, debug=False)