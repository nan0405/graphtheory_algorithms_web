/**
 * ══════════════════════════════════════════════════════════════
 *  ALGO DRIVE — game.js
 *  Vertical Infinite Runner + Algorithm Quiz
 *
 *  Direction convention:
 *    • Player xe  → cố định gần ĐÁY canvas, hướng đầu LÊN TRÊN
 *    • Obstacle xe → spawn TRÊN đỉnh canvas, di chuyển XUỐNG DƯỚI
 *    • Background road → scroll XUỐNG để tạo cảm giác xe đang tiến lên
 *
 *  3 làn đường nằm dọc (Left / Center / Right)
 *  Điều khiển: ← → hoặc A D để đổi làn
 *
 *  Classes:
 *    QuizSystem   – câu hỏi + modal
 *    Particle     – spark burst effect
 *    Player       – xe người chơi
 *    Obstacle     – xe địch
 *    UIManager    – DOM / flash / shake
 *    Game         – controller chính + loop
 * ══════════════════════════════════════════════════════════════
 */

'use strict';

/* ──────────────────────────────────────────────────────────
   QUESTION BANK  (30 câu – 3 mức difficulty)
──────────────────────────────────────────────────────────── */
const QUESTIONS = [
    // ── difficulty 1 (level 1-4) ──
    {
        q: "BFS sử dụng cấu trúc dữ liệu nào?",
        opts: ["Stack", "Queue", "Heap", "Tree"], ans: 1, cat: "BFS", diff: 1
    },
    {
        q: "DFS sử dụng cấu trúc dữ liệu nào?",
        opts: ["Queue", "Heap", "Stack / Đệ quy", "Array"], ans: 2, cat: "DFS", diff: 1
    },
    {
        q: "Độ phức tạp BFS / DFS (V đỉnh, E cạnh)?",
        opts: ["O(V²)", "O(V·E)", "O(V+E)", "O(E²)"], ans: 2, cat: "BFS/DFS", diff: 1
    },
    {
        q: "Cây khung của đồ thị n đỉnh có bao nhiêu cạnh?",
        opts: ["n", "n−1", "n+1", "2n"], ans: 1, cat: "MST", diff: 1
    },
    {
        q: "Cây (Tree) là đồ thị thoả mãn điều kiện nào?",
        opts: ["Liên thông và không có chu trình", "Có chu trình duy nhất", "Mọi đỉnh bậc 2", "Không liên thông"], ans: 0, cat: "Graph", diff: 1
    },
    {
        q: "DAG là viết tắt của?",
        opts: ["Dense Adjacency Graph", "Directed Acyclic Graph", "Dual Arc Graph", "Dynamic Array Graph"], ans: 1, cat: "Graph", diff: 1
    },
    {
        q: "Bậc của đỉnh trong đồ thị vô hướng là?",
        opts: ["Số chu trình qua đỉnh", "Số cạnh nối vào đỉnh", "Tổng trọng số", "Số đỉnh kề gián tiếp"], ans: 1, cat: "Graph", diff: 1
    },
    {
        q: "BFS tìm đường ngắn nhất theo nghĩa nào?",
        opts: ["Tổng trọng số nhỏ nhất", "Số cạnh ít nhất", "Số đỉnh trung gian", "Thời gian nhanh nhất"], ans: 1, cat: "BFS", diff: 1
    },
    {
        q: "DFS dùng để phát hiện gì trong đồ thị?",
        opts: ["Đường ngắn nhất", "Chu trình", "MST", "Max flow"], ans: 1, cat: "DFS", diff: 1
    },
    {
        q: "Đồ thị n đỉnh cần tối thiểu bao nhiêu cạnh để liên thông?",
        opts: ["n", "n−1", "n/2", "n+1"], ans: 1, cat: "Graph", diff: 1
    },

    // ── difficulty 2 (level 5-8) ──
    {
        q: "Dijkstra KHÔNG hoạt động đúng khi đồ thị có?",
        opts: ["Nhiều chu trình", "Cạnh trọng số âm", "Đỉnh bậc cao", "Không liên thông"], ans: 1, cat: "Dijkstra", diff: 2
    },
    {
        q: "Cấu trúc dữ liệu tối ưu cho Dijkstra là?",
        opts: ["Stack", "Queue thường", "Min-Heap", "Hash Map"], ans: 2, cat: "Dijkstra", diff: 2
    },
    {
        q: "Topological Sort chỉ áp dụng được cho?",
        opts: ["Đồ thị vô hướng", "DAG", "Đồ thị đầy đủ", "Đồ thị 2-phía"], ans: 1, cat: "Topo Sort", diff: 2
    },
    {
        q: "Kruskal dùng cấu trúc phụ trợ nào để tránh chu trình?",
        opts: ["Min-Heap", "Stack", "Union-Find", "Adjacency Matrix"], ans: 2, cat: "Kruskal", diff: 2
    },
    {
        q: "Prim mỗi bước thêm vào MST điều gì?",
        opts: ["Đỉnh bậc nhỏ nhất", "Cạnh nhẹ nối MST với đỉnh ngoài", "Đỉnh bất kỳ", "Cạnh nặng nhất"], ans: 1, cat: "Prim", diff: 2
    },
    {
        q: "Đồ thị Bipartite không có?",
        opts: ["Đỉnh bậc lẻ", "Cạnh có trọng số", "Chu trình độ dài lẻ", "Đỉnh bậc chẵn"], ans: 2, cat: "Bipartite", diff: 2
    },
    {
        q: "MST tối thiểu hoá điều gì?",
        opts: ["Số đỉnh", "Tổng trọng số cạnh", "Số lá", "Độ sâu cây"], ans: 1, cat: "MST", diff: 2
    },
    {
        q: "Công thức Euler cho đồ thị phẳng liên thông?",
        opts: ["V+E=F²", "V−E+F=2", "V·E=2F", "E−V+F=1"], ans: 1, cat: "Planar", diff: 2
    },
    {
        q: "Độ phức tạp Dijkstra dùng Min-Heap?",
        opts: ["O(V²)", "O(E log V)", "O((V+E) log V)", "O(V·E)"], ans: 2, cat: "Dijkstra", diff: 2
    },
    {
        q: "Chu trình Euler tồn tại trong đồ thị liên thông khi?",
        opts: ["Đúng 2 đỉnh bậc lẻ", "Mọi đỉnh bậc chẵn", "Đồ thị là cây", "Không có chu trình"], ans: 1, cat: "Euler", diff: 2
    },

    // ── difficulty 3 (level 9+) ──
    {
        q: "Bellman-Ford xử lý được gì Dijkstra không làm được?",
        opts: ["Đồ thị dày", "Cạnh trọng số âm", "Topo sort", "All-pairs path"], ans: 1, cat: "Bellman-Ford", diff: 3
    },
    {
        q: "Floyd-Warshall giải bài toán gì?",
        opts: ["MST", "Topo sort", "Shortest path mọi cặp đỉnh", "Max flow"], ans: 2, cat: "Floyd-Warshall", diff: 3
    },
    {
        q: "Độ phức tạp Floyd-Warshall?",
        opts: ["O(V+E)", "O(V²)", "O(V³)", "O(E log V)"], ans: 2, cat: "Floyd-Warshall", diff: 3
    },
    {
        q: "Thuật toán tìm SCC (Strongly Connected Components)?",
        opts: ["Dijkstra", "Prim", "Kosaraju / Tarjan", "Kruskal"], ans: 2, cat: "SCC", diff: 3
    },
    {
        q: "Max-Flow Min-Cut theorem phát biểu gì?",
        opts: ["Luồng tối đa = Σ cạnh", "Luồng tối đa = Lát cắt tối thiểu", "Luồng tối đa = V/E", "Luồng tối đa ≤ V−1"], ans: 1, cat: "Max Flow", diff: 3
    },
    {
        q: "Độ phức tạp Bellman-Ford?",
        opts: ["O(V log E)", "O(V+E)", "O(V×E)", "O(E²)"], ans: 2, cat: "Bellman-Ford", diff: 3
    },
    {
        q: "Thuật toán Hierholzer tìm gì?",
        opts: ["Đường Hamilton", "Chu trình / Đường đi Euler", "MST", "Shortest path"], ans: 1, cat: "Euler", diff: 3
    },
    {
        q: "TSP (người bán hàng) là biến thể của?",
        opts: ["Đường đi Euler", "Đường đi Hamilton", "Max flow", "Topo sort"], ans: 1, cat: "Hamilton", diff: 3
    },
    {
        q: "Độ phức tạp Union-Find với path compression?",
        opts: ["O(log n)", "O(n)", "O(α(n)) ≈ O(1)", "O(n log n)"], ans: 2, cat: "Union-Find", diff: 3
    },
    {
        q: "Kruskal hiệu quả hơn Prim khi nào?",
        opts: ["Đồ thị dày", "Đồ thị thưa (ít cạnh)", "Không có trọng số", "Đồ thị đầy đủ"], ans: 1, cat: "Kruskal", diff: 3
    },
];

/* ──────────────────────────────────────────────────────────
   CANVAS DIMENSIONS & LANE LAYOUT
   Canvas: 500 wide × 700 tall  (vertical road)
   3 lanes arranged left/center/right
──────────────────────────────────────────────────────────── */
const CW = 500;          // canvas width
const CH = 700;          // canvas height
const LANE_COUNT = 3;
const LANE_W = CW / LANE_COUNT;
// X-center of each lane
const LANE_X = [
    LANE_W * 0.5,          // lane 0 = left
    LANE_W * 1.5,          // lane 1 = center
    LANE_W * 2.5,          // lane 2 = right
];

// Car sizes
const P_W = 44, P_H = 80;    // player
const O_W = 40, O_H = 72;    // obstacle

// Obstacle traffic colours
const TRAFFIC_COLS = ['#a855f7', '#f59e0b', '#22c55e', '#f43f5e', '#84cc16', '#e879f9', '#38bdf8'];

/* ──────────────────────────────────────────────────────────
   UTILITIES
──────────────────────────────────────────────────────────── */
const rnd = (a, b) => Math.random() * (b - a) + a;
const rndI = (a, b) => Math.floor(rnd(a, b + 1));

/** Draw rounded rectangle path */
function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/** AABB collision test */
function aabbHit(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
        a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Draw a neon car body centred at (0,0).
 *  heading=0 → front faces UP (toward negative Y).
 *  heading=Math.PI → front faces DOWN.
 */
function drawCar(ctx, w, h, color, heading) {
    ctx.save();
    ctx.rotate(heading);

    // Body glow
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.fillStyle = color;
    rrect(ctx, -w / 2, -h / 2, w, h, 7);
    ctx.fill();

    // Cockpit window
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(-w / 2 + 5, -h / 2 + 8, w - 10, h * 0.28);

    // Headlights (front = top when heading=0)
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 12;
    ctx.fillRect(-w / 2 + 4, -h / 2, 9, 5);
    ctx.fillRect(w / 2 - 13, -h / 2, 9, 5);

    // Tail lights (rear = bottom when heading=0)
    ctx.fillStyle = '#ff3300';
    ctx.shadowColor = '#ff3300'; ctx.shadowBlur = 8;
    ctx.fillRect(-w / 2 + 4, h / 2 - 5, 9, 5);
    ctx.fillRect(w / 2 - 13, h / 2 - 5, 9, 5);

    ctx.restore();
}

/* ══════════════════════════════════════════════════════════
   CLASS: QuizSystem
   Manages the question bank, modal display, and callback.
══════════════════════════════════════════════════════════ */
class QuizSystem {
    constructor() {
        this._ov = document.getElementById('quiz-ov');
        this._box = document.getElementById('quiz-box');
        this._cat = document.getElementById('qz-cat');
        this._dif = document.getElementById('qz-diff');
        this._qEl = document.getElementById('qz-question');
        this._opt = document.getElementById('qz-options');
        this._res = document.getElementById('qz-result');
        this._rtx = document.getElementById('qz-result-txt');

        this.active = false;
        this._cb = null;
    }

    async show(level, cb) {
        if (this.active) return;
        this.active = true;
        this._cb = cb;

        try {
            // Gọi API từ Controller của bạn
            const response = await fetch('http://localhost:5107/api/quizzes/random');
            if (!response.ok) throw new Error("Không thể kết nối API");

            const data = await response.json();
            // data lúc này có dạng: { id, question, options: [{ optionText, isCorrect }, ...] }

            // Đổ dữ liệu vào giao diện
            this._cat.textContent = "ALGORITHM"; // Bạn có thể sửa API để trả thêm Title nếu muốn
            this._dif.textContent = 'LV' + (level || 1);
            this._qEl.textContent = data.question; // Map 'question' từ API
            this._opt.innerHTML = '';
            this._res.className = 'hidden';

            // Tạo các nút bấm từ danh sách options
            data.options.forEach((opt, i) => {
                const btn = document.createElement('button');
                btn.className = 'qz-opt';
                const lbl = String.fromCharCode(65 + i); // A, B, C, D
                btn.innerHTML = `<span class="lbl">${lbl}</span>${opt.optionText}`;

                // Gắn sự kiện click: kiểm tra trực tiếp opt.isCorrect
                btn.addEventListener('click', () => this._answer(btn, opt.isCorrect, data.options));
                this._opt.appendChild(btn);
            });

            // Hiển thị modal
            this._ov.classList.remove('hidden');
            this._box.style.animation = 'none';
            void this._box.offsetHeight;
            this._box.style.animation = '';

        } catch (error) {
            console.error("Lỗi tải câu hỏi:", error);
            this.active = false;
            if (this._cb) this._cb(true); // Cho qua nếu lỗi để game ko treo
        }
    }

    _answer(clickedBtn, isCorrect, allOptions) {
        if (!this.active) return;

        const btns = this._opt.querySelectorAll('.qz-opt');
        btns.forEach(b => (b.disabled = true));

        // Hiển thị đúng/sai
        if (isCorrect) {
            clickedBtn.classList.add('correct');
        } else {
            clickedBtn.classList.add('wrong');
            // Tìm và highlight đáp án đúng
            const correctIdx = allOptions.findIndex(o => o.isCorrect);
            if (correctIdx !== -1) btns[correctIdx].classList.add('correct');
        }

        this._res.className = isCorrect ? 'ok' : 'fail';
        this._rtx.textContent = isCorrect ? '✓ CHÍNH XÁC! +3 ĐIỂM' : '✗ SAI RỒI! -1 MẠNG';

        setTimeout(() => {
            this.hide();
            if (this._cb) this._cb(isCorrect);
        }, 1100);
    }

    hide() { this.active = false; this._ov.classList.add('hidden'); }
    reset() { this.active = false; this._ov.classList.add('hidden'); }
}

/* ══════════════════════════════════════════════════════════
   CLASS: Particle
   Single spark for burst effects.
══════════════════════════════════════════════════════════ */
class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.color = color;
        const angle = rnd(0, Math.PI * 2);
        const speed = rnd(2.5, 8);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.life = 1;
        this.decay = rnd(0.024, 0.055);
        this.r = rnd(2, 5.5);
        this.active = true;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.14;      // gravity pulls down
        this.vx *= 0.97;
        this.life -= this.decay;
        if (this.life <= 0) this.active = false;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

/* ══════════════════════════════════════════════════════════
   CLASS: Player
   • Y position is FIXED near the bottom of the canvas.
   • Moves LEFT / RIGHT between lanes (X changes).
   • Car visual has its front (headlights) pointing UP.
══════════════════════════════════════════════════════════ */
class Player {
    constructor() {
        this.lane = 1;           // start center
        this.targetLane = 1;
        this.x = LANE_X[1];
        this.y = CH - 120;    // fixed near bottom
        this.w = P_W;
        this.h = P_H;
        this.color = '#00f0ff';
        this.moving = false;
        this.trail = [];

        // Brief invincibility after resuming from quiz/collision
        this.invincible = false;
        this.invincibleFrames = 0;

        // Edge-detect key state
        this._wasLeft = false;
        this._wasRight = false;
    }

    /** @param {Object} keys  Live key map */
    update(keys) {
        const leftNow = !!(keys['ArrowLeft'] || keys['a'] || keys['A']);
        const rightNow = !!(keys['ArrowRight'] || keys['d'] || keys['D']);

        // Rising edge only → lane change
        if (leftNow && !this._wasLeft && !this.moving && this.targetLane > 0) {
            this.targetLane--;
            this.moving = true;
        }
        if (rightNow && !this._wasRight && !this.moving && this.targetLane < LANE_COUNT - 1) {
            this.targetLane++;
            this.moving = true;
        }
        this._wasLeft = leftNow;
        this._wasRight = rightNow;

        // Smooth lerp X → target lane center
        const tx = LANE_X[this.targetLane];
        const dx = tx - this.x;
        if (Math.abs(dx) < 0.8) {
            this.x = tx;
            this.lane = this.targetLane;
            this.moving = false;
        } else {
            this.x += dx * 0.22;
        }

        // Invincibility countdown
        if (this.invincible) {
            if (--this.invincibleFrames <= 0) this.invincible = false;
        }

        // Trail for ghost effect
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 9) this.trail.shift();
    }

    draw(ctx) {
        // Ghost trail
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            ctx.save();
            ctx.globalAlpha = (i / this.trail.length) * 0.18;
            ctx.fillStyle = this.color;
            ctx.fillRect(t.x - this.w / 2, t.y - this.h / 2, this.w, this.h);
            ctx.restore();
        }

        // Flicker when invincible
        if (this.invincible && (this.invincibleFrames % 8) < 4) return;

        ctx.save();
        ctx.translate(this.x, this.y);
        drawCar(ctx, this.w, this.h, this.color, 0);  // heading=0 → front faces UP
        ctx.restore();

        // Invincibility ring
        if (this.invincible) {
            const alpha = this.invincibleFrames / 160;
            ctx.save();
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha * 0.6;
            ctx.shadowColor = this.color; ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 46, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    /** Inset AABB for fair collision detection */
    get hitbox() {
        const p = 8;
        return {
            x: this.x - this.w / 2 + p,
            y: this.y - this.h / 2 + p,
            w: this.w - p * 2,
            h: this.h - p * 2,
        };
    }
}

/* ══════════════════════════════════════════════════════════
   CLASS: Obstacle
   Spawns ABOVE the canvas (negative Y) and scrolls DOWN.
   Front of car faces the player (heading = 0, i.e. front UP
   but since it's coming from above it will look like it faces
   toward player — we rotate 180° so its headlights face DOWN).
══════════════════════════════════════════════════════════ */
class Obstacle {
    constructor() {
        this.lane = rndI(0, LANE_COUNT - 1);
        this.x = LANE_X[this.lane];
        this.y = -O_H - 10;          // spawn above screen
        this.w = O_W;
        this.h = O_H;
        this.color = TRAFFIC_COLS[rndI(0, TRAFFIC_COLS.length - 1)];
        this.active = true;
        this._passed = false;              // scored when player passes it
        this._spdVar = rnd(-0.4, 0.5);    // per-obstacle speed variance
    }

    /** @param {number} speed  global game speed (px/frame downward) */
    update(speed) {
        this.y += speed + this._spdVar;    // moves DOWN (y increases)
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        drawCar(ctx, this.w, this.h, this.color, Math.PI); // heading=π → front faces DOWN
        ctx.restore();
    }

    get hitbox() {
        const p = 8;
        return {
            x: this.x - this.w / 2 + p,
            y: this.y - this.h / 2 + p,
            w: this.w - p * 2,
            h: this.h - p * 2,
        };
    }
}

/* ══════════════════════════════════════════════════════════
   CLASS: UIManager
   Thin wrapper for all DOM side-effects.
══════════════════════════════════════════════════════════ */
class UIManager {
    constructor() {
        this._score = document.getElementById('h-score');
        this._level = document.getElementById('h-level');
        this._best = document.getElementById('h-best');
        this._lvbar = document.getElementById('lvbar');
        this._hearts = [
            document.getElementById('hp1'),
            document.getElementById('hp2'),
            document.getElementById('hp3'),
        ];
        this._flash = document.getElementById('flash');
        this._cvs = document.getElementById('cvs');
        this._ft = null;
        this._st = null;
    }

    setScore(v) { this._score.textContent = v; }
    setLevel(v) { this._level.textContent = v; }
    setBest(v) { this._best.textContent = v; }

    /** @param {number} pct  0 to 1 */
    setLvBar(pct) { this._lvbar.style.width = (pct * 100).toFixed(1) + '%'; }

    /** @param {number} n  remaining lives (0-3) */
    setLives(n) {
        this._hearts.forEach((h, i) => h.classList.toggle('lost', i >= n));
    }

    /** @param {'red'|'green'} type */
    flash(type) {
        clearTimeout(this._ft);
        this._flash.className = type;
        this._ft = setTimeout(() => { this._flash.className = ''; }, 380);
    }

    /** Canvas shake via CSS class */
    shake() {
        clearTimeout(this._st);
        this._cvs.classList.remove('shake');
        void this._cvs.offsetHeight;          // force reflow
        this._cvs.classList.add('shake');
        this._st = setTimeout(() => this._cvs.classList.remove('shake'), 400);
    }
}

/* ══════════════════════════════════════════════════════════
   CLASS: Game
   Central controller. Owns all state + main rAF loop.
══════════════════════════════════════════════════════════ */
class Game {
    constructor() {
        // ── Canvas ──
        this.canvas = document.getElementById('cvs');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = CW;
        this.canvas.height = CH;

        // ── Sub-systems ──
        this.quiz = new QuizSystem();
        this.ui = new UIManager();

        // ── Persistent ──
        this.highScore = parseInt(localStorage.getItem('ad2_hs') || '0', 10);

        // ── Runtime (also initialised in _reset) ──
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameSpeed = 4.5;     // px per frame (obstacles fall this fast)
        this.spawnInterval = 88;      // frames between obstacle spawns
        this._spawnTimer = 0;
        this._roadOff = 0;       // road stripe scroll offset

        // Parallax background layers
        this._bgLayers = [
            { speed: 0.28, alpha: 0.030, gap: 120 },  // far layer
            { speed: 0.60, alpha: 0.050, gap: 75 },  // mid layer
            { speed: 1.00, alpha: 0.085, gap: 44 },  // near layer
        ];

        // Entity pools
        this.obstacles = [];
        this.particles = [];

        // Player
        this.player = new Player();

        // Input
        this.keys = Object.create(null);

        // State machine: 'menu' | 'countdown' | 'playing' | 'paused' | 'gameover'
        this.state = 'menu';

        // ── Boot ──
        this._bindEvents();
        this._syncMenuHS();
        this._showScreen('s-menu');
        requestAnimationFrame(this._loop.bind(this));
    }

    /* ─────────────────────────────────────
       EVENT BINDING
    ───────────────────────────────────── */
    _bindEvents() {
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            const prevent = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '];
            if (prevent.includes(e.key)) e.preventDefault();
        });
        window.addEventListener('keyup', e => { delete this.keys[e.key]; });

        document.getElementById('btn-start').addEventListener('click', () => this._startCountdown());
        document.getElementById('btn-retry').addEventListener('click', () => this._startCountdown());
        document.getElementById('btn-menu').addEventListener('click', () => this._goMenu());
    }

    /* ─────────────────────────────────────
       SCREEN MANAGEMENT
    ───────────────────────────────────── */
    _showScreen(id) {
        document.querySelectorAll('.screen').forEach(s => {
            s.className = (s.id === id) ? 'screen on' : 'screen off';
        });
    }

    _syncMenuHS() {
        document.getElementById('menu-hs-val').textContent = this.highScore;
    }

    _goMenu() {
        this.state = 'menu';
        document.getElementById('hud').classList.add('hidden');
        this.quiz.reset();
        this._showScreen('s-menu');
        this._syncMenuHS();
    }

    /* ─────────────────────────────────────
       COUNTDOWN → PLAY
    ───────────────────────────────────── */
    _startCountdown() {
        this._reset();
        this._showScreen('s-cd');
        document.getElementById('hud').classList.add('hidden');
        this.state = 'countdown';

        const el = document.getElementById('cd-num');
        let n = 3;
        el.textContent = n; el.className = '';

        const tick = () => {
            n--;
            // Re-trigger pop animation
            el.style.animation = 'none'; void el.offsetHeight; el.style.animation = '';

            if (n <= 0) {
                el.textContent = 'GO!'; el.className = 'go';
                setTimeout(() => {
                    document.getElementById('s-cd').className = 'screen off';
                    document.getElementById('hud').classList.remove('hidden');
                    this.state = 'playing';
                }, 680);
            } else {
                el.textContent = n;
                setTimeout(tick, 900);
            }
        };
        setTimeout(tick, 900);
    }

    /* ─────────────────────────────────────
       RESET  (called before each new game)
    ───────────────────────────────────── */
    _reset() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameSpeed = 4.5;
        this.spawnInterval = 88;
        this._spawnTimer = 0;
        this._roadOff = 0;
        this.obstacles = [];
        this.particles = [];
        this.player = new Player();
        this.quiz.reset();
        this.ui.setScore(0);
        this.ui.setLevel(1);
        this.ui.setLvBar(0);
        this.ui.setLives(3);
        this.ui.setBest(this.highScore);
    }

    /* ─────────────────────────────────────
       SPAWN OBSTACLE
    ───────────────────────────────────── */
    spawnObstacle() {
        const last = this.obstacles[this.obstacles.length - 1];
        const obs = new Obstacle();

        // Avoid two consecutive same-lane spawns
        if (last && last.lane === obs.lane && Math.random() < 0.65) {
            obs.lane = (obs.lane + 1 + rndI(0, 1)) % LANE_COUNT;
        }
        obs.x = LANE_X[obs.lane];
        this.obstacles.push(obs);
    }

    /* ─────────────────────────────────────
       LEVEL UP
    ───────────────────────────────────── */
    levelUp() {
        this.level++;
        this.gameSpeed = Math.min(16, this.gameSpeed + 0.9);
        this.spawnInterval = Math.max(26, this.spawnInterval - 7);

        this.ui.setLevel(this.level);
        this.ui.flash('green');

        // Level-up overlay — non-blocking, auto-dismisses after 1.5 s
        const screen = document.getElementById('s-lu');
        document.getElementById('lu-num').textContent = this.level;
        screen.className = 'screen on no-ptr';

        const inner = document.getElementById('lu-inner');
        inner.style.animation = 'none'; void inner.offsetHeight; inner.style.animation = '';

        setTimeout(() => { screen.className = 'screen off no-ptr'; }, 1500);
    }

    /* ─────────────────────────────────────
       COLLISION HANDLING
    ───────────────────────────────────── */
    handleCollision(obs) {
        obs.active = false;
        this.state = 'paused';    // freeze update loop

        this.ui.shake();
        this.ui.flash('red');

        // Show quiz after a tiny delay so shake is visible
        setTimeout(() => {
            this.quiz.show(this.level, (correct) => {
                if (correct) {
                    this.score += 3;
                    this.ui.setScore(this.score);
                    this.ui.setBest(Math.max(this.score, this.highScore));
                    this.ui.flash('green');
                    this._burst(this.player.x, this.player.y, '#00ffaa', 24);
                } else {
                    this.lives--;
                    this.ui.setLives(this.lives);
                    this.ui.flash('red');
                    this._burst(this.player.x, this.player.y, '#ff2070', 16);

                    if (this.lives <= 0) {
                        setTimeout(() => this.gameOver(), 260);
                        return;
                    }
                }
                // Resume game with a safe window
                this._resumeSafely();
            });
        }, 180);
    }

    /* ─────────────────────────────────────
       RESUME AFTER QUIZ / LEVEL-UP
       Clears nearby obstacles and grants invincibility.
    ───────────────────────────────────── */
    _resumeSafely() {
        // Remove obstacles that are too close (below spawn point + danger zone)
        const dangerTop = this.player.y - 200;
        this.obstacles = this.obstacles.filter(o => o.y > this.player.y + 60 || o.y < dangerTop);

        // Reset spawn cooldown so nothing arrives immediately
        this._spawnTimer = 0;

        // Grant invincibility frames (~2.7 s at 60fps)
        this.player.invincible = true;
        this.player.invincibleFrames = 160;

        // Resume
        this.state = 'playing';
    }

    /* ─────────────────────────────────────
       GAME OVER
    ───────────────────────────────────── */
    gameOver() {
        this.state = 'gameover';

        const isRecord = this.score > this.highScore;
        if (isRecord) {
            this.highScore = this.score;
            localStorage.setItem('ad2_hs', this.highScore);
        }

        document.getElementById('go-score').textContent = this.score;
        document.getElementById('go-lv').textContent = this.level;
        document.getElementById('go-best').textContent = this.highScore;
        document.getElementById('go-rec').classList.toggle('hidden', !isRecord);
        document.getElementById('hud').classList.add('hidden');
        this._showScreen('s-go');
    }

    /* ─────────────────────────────────────
       PARTICLE BURST
    ───────────────────────────────────── */
    _burst(x, y, color, n) {
        for (let i = 0; i < n; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    /* ══════════════════════════════════════
       MAIN LOOP
    ══════════════════════════════════════ */
    _loop() {
        if (this.state === 'playing') this._update();
        this._render();
        requestAnimationFrame(this._loop.bind(this));
    }

    /* ══════════════════════════════════════
       UPDATE  (only when state === 'playing')
    ══════════════════════════════════════ */
    _update() {
        // ── Player ──
        this.player.update(this.keys);

        // ── Spawn obstacles ──
        this._spawnTimer++;
        if (this._spawnTimer >= this.spawnInterval) {
            this._spawnTimer = 0;
            this.spawnObstacle();
        }

        // ── Update obstacles, scoring, collision ──
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.update(this.gameSpeed);

            // Obstacle scrolled BELOW the player → player dodged it → +1 point
            if (!obs._passed && obs.y > this.player.y + this.player.h) {
                obs._passed = true;
                this.score++;
                this.ui.setScore(this.score);
                this.ui.setBest(Math.max(this.score, this.highScore));

                // Small spark reward at player position
                this._burst(this.player.x, this.player.y - 30, '#00f0ff', 8);

                // Level progression
                const newLv = 1 + Math.floor(this.score / 30);
                if (newLv !== this.level) this.levelUp();
                this.ui.setLvBar((this.score % 30) / 30);
            }

            // Collision check (skip if player is invincible)
            if (!obs._passed && !this.player.invincible &&
                aabbHit(this.player.hitbox, obs.hitbox)) {
                this.handleCollision(obs);
                return;   // stop processing this frame
            }
        }

        // ── Particles ──
        for (const p of this.particles) p.update();

        // ── Road scroll ──
        // Road stripes move DOWN (same direction as obstacles) to simulate
        // the player's car moving upward.
        this._roadOff = (this._roadOff + this.gameSpeed) % 80;

        // ── Cull off-screen entities ──
        this.obstacles = this.obstacles.filter(o => o.active && o.y < CH + 80);
        this.particles = this.particles.filter(p => p.active);
    }

    /* ══════════════════════════════════════
       RENDER
    ══════════════════════════════════════ */
    _render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, CW, CH);

        // Background fill
        ctx.fillStyle = '#03040e';
        ctx.fillRect(0, 0, CW, CH);

        // Parallax speed lines (scrolling down)
        this._drawParallax(ctx);

        // Road surface
        this._drawRoad(ctx);

        if (this.state === 'menu') {
            // Animate road even on menu for ambience
            this._roadOff = (this._roadOff + 2.5) % 80;
            return;
        }

        // Obstacles (behind player)
        for (const obs of this.obstacles) obs.draw(ctx);

        // Player
        this.player.draw(ctx);

        // Particles (on top of everything)
        for (const p of this.particles) p.draw(ctx);
    }

    /* ── Parallax horizontal speed lines (simulate forward motion) ── */
    _drawParallax(ctx) {
        for (const L of this._bgLayers) {
            // Each layer scrolls at a different rate to create depth
            const off = (this._roadOff * L.speed) % L.gap;
            ctx.fillStyle = `rgba(0,240,255,${L.alpha})`;
            // Horizontal lines moving downward
            let y = off - L.gap;
            while (y < CH + L.gap) {
                ctx.fillRect(0, y, CW, 1.2);
                y += L.gap;
            }
        }
    }

    /* ── Road: lane dividers, edge glows, active-lane highlight ── */
    _drawRoad(ctx) {
        // Road base
        ctx.fillStyle = 'rgba(6,8,25,0.86)';
        ctx.fillRect(0, 0, CW, CH);

        // Left & right edge glow
        const edgeGlow = (x) => {
            const g = ctx.createLinearGradient(x - 5, 0, x + 5, 0);
            g.addColorStop(0, 'transparent');
            g.addColorStop(0.5, 'rgba(0,240,255,.42)');
            g.addColorStop(1, 'transparent');
            ctx.fillStyle = g;
            ctx.fillRect(x - 5, 0, 10, CH);
        };
        edgeGlow(2);
        edgeGlow(CW - 2);

        // Vertical lane dividers with animated dashes (scroll DOWN)
        ctx.strokeStyle = 'rgba(255,255,255,.09)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([28, 22]);
        ctx.lineDashOffset = -(this._roadOff * 1.4);  // negative → dashes scroll down

        [LANE_W, LANE_W * 2].forEach(x => {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CH); ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.lineDashOffset = 0;

        // Active-lane soft glow (follows player target lane)
        if (this.state === 'playing' || this.state === 'paused') {
            const lx = LANE_X[this.player.targetLane] - LANE_W / 2;
            const g = ctx.createLinearGradient(0, CH * 0.5, 0, CH);
            g.addColorStop(0, 'rgba(0,240,255,0)');
            g.addColorStop(1, 'rgba(0,240,255,0.052)');
            ctx.fillStyle = g;
            ctx.fillRect(lx, 0, LANE_W, CH);
        }
    }
}

/* ──────────────────────────────────────────────────────────
   BOOT — create Game instance when DOM is ready
──────────────────────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => {
    window._game = new Game();
});