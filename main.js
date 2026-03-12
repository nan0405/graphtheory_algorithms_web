/**
 * AlgoViz SPA — main.js
 * Vanilla JS, no frameworks.
 * Features: SPA routing, chat system, algo demo, FAQ accordion,
 *           canvas animations, scroll observer, hero graph.
 */

/* ═══════════════════════════════════════════
   1. SPA ROUTER
═══════════════════════════════════════════ */
const Router = (() => {
    let sections, navLinks, clickables;
    let current = 'home';

    function navigate(sectionId) {
        if (sectionId === current) return;

        // Hide old
        const oldEl = document.getElementById(`section-${current}`);
        if (oldEl) {
            oldEl.style.opacity = '0';
            oldEl.style.transform = 'translateY(12px)';
            setTimeout(() => {
                oldEl.classList.remove('active');
                oldEl.style.opacity = '';
                oldEl.style.transform = '';
            }, 220);
        }

        // Show new
        setTimeout(() => {
            const newEl = document.getElementById(`section-${sectionId}`);
            if (!newEl) return;
            current = sectionId;
            newEl.classList.add('active');

            // Update nav highlights
            navLinks.forEach(l => {
                l.classList.toggle('active', l.dataset.section === sectionId);
            });

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });

            // Trigger section init
            onSectionEnter(sectionId);
        }, 230);
    }

    function onSectionEnter(id) {
        if (id === 'home') {
            initHeroGraph();
            initScrollReveal();
        }
        if (id === 'visualize') {
            initAlgoPreviews();
        }
    }

    // Wire all clickable elements with data-section
    function init() {
        sections = document.querySelectorAll('.section');
        navLinks = document.querySelectorAll('.nav-link');
        clickables = document.querySelectorAll('[data-section]');

        clickables.forEach(el => {
            el.addEventListener('click', () => {
                const target = el.dataset.section;
                if (target) navigate(target);
            });
        });

        // Footer links
        document.querySelectorAll('.footer-links a[data-section]').forEach(a => {
            a.addEventListener('click', e => {
                e.preventDefault();
                navigate(a.dataset.section);
            });
        });

        // Set initial section
        document.getElementById('section-home').classList.add('active');
        onSectionEnter('home');
    }

    return { init, navigate };
})();


/* ═══════════════════════════════════════════
   2. HEADER BEHAVIOR
═══════════════════════════════════════════ */
const Header = (() => {
    function init() {
        const header = document.getElementById('site-header');
        const hamburger = document.getElementById('hamburger');
        const nav = document.getElementById('main-nav');

        // Sticky shadow on scroll
        window.addEventListener('scroll', () => {
            if (header) header.classList.toggle('scrolled', window.scrollY > 10);
        }, { passive: true });

        // Mobile hamburger (optional - may be commented out in HTML)
        if (hamburger) {
            hamburger.addEventListener('click', () => {
                nav.classList.toggle('open');
                hamburger.classList.toggle('open');
            });
        }

        // Close nav when a link is clicked
        if (nav) {
            nav.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    nav.classList.remove('open');
                });
            });
        }
    }

    return { init };
})();


/* ═══════════════════════════════════════════
   3. BACKGROUND CANVAS — PARTICLE NETWORK
═══════════════════════════════════════════ */
const BgCanvas = (() => {
    let canvas, ctx;
    let W, H, particles, raf;

    const PARTICLE_COUNT = 55;
    const MAX_DIST = 140;
    const CYAN = '34,211,238';
    const BLUE = '59,130,246';

    class Particle {
        constructor() { this.reset(true); }
        reset(initial = false) {
            this.x = Math.random() * W;
            this.y = initial ? Math.random() * H : -10;
            this.vx = (Math.random() - 0.5) * 0.35;
            this.vy = (Math.random() - 0.5) * 0.35;
            this.r = Math.random() * 2 + 1;
            this.color = Math.random() > 0.5 ? CYAN : BLUE;
        }
        update() {
            this.x += this.vx;
            this.y += this.vy;
            if (this.x < 0 || this.x > W) this.vx *= -1;
            if (this.y < 0 || this.y > H) this.vy *= -1;
        }
        draw() {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(${this.color},0.7)`;
            ctx.fill();
        }
    }

    function resize() {
        W = canvas.width = window.innerWidth;
        H = canvas.height = window.innerHeight;
    }

    function tick() {
        ctx.clearRect(0, 0, W, H);

        // Connections
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const dx = particles[i].x - particles[j].x;
                const dy = particles[i].y - particles[j].y;
                const d = Math.hypot(dx, dy);
                if (d < MAX_DIST) {
                    const alpha = (1 - d / MAX_DIST) * 0.25;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(${CYAN},${alpha})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        particles.forEach(p => { p.update(); p.draw(); });
        raf = requestAnimationFrame(tick);
    }

    function init() {
        canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');
        resize();
        particles = Array.from({ length: PARTICLE_COUNT }, () => new Particle());
        tick();
        window.addEventListener('resize', resize, { passive: true });
    }

    return { init };
})();


/* ═══════════════════════════════════════════
   4. HERO GRAPH ANIMATION
═══════════════════════════════════════════ */
function initHeroGraph() {
    const container = document.getElementById('hero-graph');
    if (!container || container.dataset.init) return;
    container.dataset.init = '1';

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');
    svg.style.position = 'absolute';
    svg.style.inset = '0';
    container.appendChild(svg);

    const nodes = [
        { id: 'A', x: 50, y: 50 },
        { id: 'B', x: 25, y: 30 },
        { id: 'C', x: 75, y: 30 },
        { id: 'D', x: 15, y: 65 },
        { id: 'E', x: 50, y: 20 },
        { id: 'F', x: 85, y: 55 },
        { id: 'G', x: 35, y: 80 },
        { id: 'H', x: 65, y: 75 },
    ];

    const edges = [
        ['A', 'B'], ['A', 'C'], ['A', 'G'], ['A', 'H'],
        ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'E'],
        ['G', 'D'], ['H', 'F'], ['E', 'A'],
    ];

    let animStep = 0;
    const visited = new Set();
    const activeEdges = new Set();

    // Draw edges
    const edgeEls = {};
    edges.forEach(([s, t]) => {
        const n1 = nodes.find(n => n.id === s);
        const n2 = nodes.find(n => n.id === t);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', n1.x + '%');
        line.setAttribute('y1', n1.y + '%');
        line.setAttribute('x2', n2.x + '%');
        line.setAttribute('y2', n2.y + '%');
        line.setAttribute('stroke', 'rgba(99,179,237,0.15)');
        line.setAttribute('stroke-width', '1.5');
        svg.appendChild(line);
        edgeEls[`${s}-${t}`] = line;
        edgeEls[`${t}-${s}`] = line;
    });

    // Draw nodes
    const nodeEls = {};
    nodes.forEach(n => {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', n.x + '%');
        circle.setAttribute('cy', n.y + '%');
        circle.setAttribute('r', '14');
        circle.setAttribute('fill', 'rgba(17,24,39,0.8)');
        circle.setAttribute('stroke', 'rgba(99,179,237,0.3)');
        circle.setAttribute('stroke-width', '1.5');

        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', n.x + '%');
        text.setAttribute('y', n.y + '%');
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('dominant-baseline', 'central');
        text.setAttribute('fill', 'rgba(148,163,184,0.9)');
        text.setAttribute('font-size', '10');
        text.setAttribute('font-family', 'JetBrains Mono, monospace');
        text.setAttribute('font-weight', '600');
        text.textContent = n.id;

        g.appendChild(circle);
        g.appendChild(text);
        svg.appendChild(g);
        nodeEls[n.id] = { circle, text };
    });

    // BFS animation
    const bfsOrder = ['A', 'B', 'C', 'G', 'H', 'D', 'E', 'F'];
    let idx = 0;

    function animateStep() {
        if (idx < bfsOrder.length) {
            const nid = bfsOrder[idx];
            visited.add(nid);
            const el = nodeEls[nid];
            el.circle.setAttribute('fill', 'rgba(34,211,238,0.2)');
            el.circle.setAttribute('stroke', 'rgba(34,211,238,0.9)');
            el.circle.setAttribute('stroke-width', '2');
            el.text.setAttribute('fill', 'rgba(34,211,238,1)');

            // Light up edges
            edges.forEach(([s, t]) => {
                if ((s === nid && visited.has(t)) || (t === nid && visited.has(s))) {
                    const key = `${s}-${t}`;
                    if (edgeEls[key]) {
                        edgeEls[key].setAttribute('stroke', 'rgba(34,211,238,0.45)');
                        edgeEls[key].setAttribute('stroke-width', '2');
                    }
                }
            });

            idx++;
        } else {
            // Reset
            idx = 0;
            visited.clear();
            nodes.forEach(n => {
                nodeEls[n.id].circle.setAttribute('fill', 'rgba(17,24,39,0.8)');
                nodeEls[n.id].circle.setAttribute('stroke', 'rgba(99,179,237,0.3)');
                nodeEls[n.id].circle.setAttribute('stroke-width', '1.5');
                nodeEls[n.id].text.setAttribute('fill', 'rgba(148,163,184,0.9)');
            });
            edges.forEach(([s, t]) => {
                const key = `${s}-${t}`;
                if (edgeEls[key]) {
                    edgeEls[key].setAttribute('stroke', 'rgba(99,179,237,0.15)');
                    edgeEls[key].setAttribute('stroke-width', '1.5');
                }
            });
        }
    }

    setInterval(animateStep, 700);
}


/* ═══════════════════════════════════════════
   5. SCROLL REVEAL OBSERVER
═══════════════════════════════════════════ */
function initScrollReveal() {
    const targets = document.querySelectorAll('.reveal-section');
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
            }
        });
    }, { threshold: 0.1 });

    targets.forEach(el => observer.observe(el));
}


/* ═══════════════════════════════════════════
   6. ALGO PREVIEW MINI CANVASES
═══════════════════════════════════════════ */
function initAlgoPreviews() {
    document.querySelectorAll('.algo-preview-canvas').forEach(canvas => {
        if (canvas.dataset.drawn) return;
        canvas.dataset.drawn = '1';

        const algo = canvas.dataset.algo;
        const ctx = canvas.getContext('2d');
        const W = canvas.offsetWidth || 200;
        const H = canvas.offsetHeight || 100;
        canvas.width = W;
        canvas.height = H;

        drawAlgoPreview(ctx, algo, W, H);
    });
}

function drawAlgoPreview(ctx, algo, W, H) {
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = '#0b1120';
    ctx.fillRect(0, 0, W, H);

    const nodes = [
        { x: 0.15, y: 0.5 },
        { x: 0.38, y: 0.2 },
        { x: 0.38, y: 0.8 },
        { x: 0.62, y: 0.2 },
        { x: 0.62, y: 0.8 },
        { x: 0.85, y: 0.5 },
    ];

    const edges = [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 5], [1, 2], [3, 4]];

    // Color scheme per algo
    const colors = {
        dijkstra: { node: '#22d3ee', edge: '#3b82f6', visited: '#10b981' },
        bellman: { node: '#f59e0b', edge: '#ef4444', visited: '#8b5cf6' },
        prim: { node: '#10b981', edge: '#22d3ee', visited: '#3b82f6' },
        kruskal: { node: '#8b5cf6', edge: '#6366f1', visited: '#a78bfa' },
        dfs: { node: '#ef4444', edge: '#f97316', visited: '#fbbf24' },
        bfs: { node: '#22d3ee', edge: '#3b82f6', visited: '#06b6d4' },
        euler: { node: '#a78bfa', edge: '#8b5cf6', visited: '#c4b5fd' },
        hamilton: { node: '#f472b6', edge: '#ec4899', visited: '#fb7185' },
    };
    const c = colors[algo] || colors.bfs;

    // Determine "visited" nodes based on algo name (just visual variety)
    const visitedMap = {
        dijkstra: [0, 1, 3],
        bellman: [0, 2, 4],
        prim: [0, 1, 2],
        kruskal: [0, 1, 3, 5],
        dfs: [0, 1, 3, 5],
        bfs: [0, 1, 2, 3],
        euler: [0, 1, 3, 5, 4, 2],
        hamilton: [0, 1, 3, 5, 4, 2, 0],
    };
    const vis = new Set(visitedMap[algo] || []);

    // Draw edges
    edges.forEach(([a, b]) => {
        const n1 = nodes[a], n2 = nodes[b];
        const isActive = vis.has(a) && vis.has(b);
        ctx.beginPath();
        ctx.moveTo(n1.x * W, n1.y * H);
        ctx.lineTo(n2.x * W, n2.y * H);
        ctx.strokeStyle = isActive ? c.edge + 'cc' : 'rgba(99,179,237,0.15)';
        ctx.lineWidth = isActive ? 2 : 1;
        ctx.stroke();
    });

    // Draw nodes
    nodes.forEach((n, i) => {
        const x = n.x * W, y = n.y * H;
        const isVisited = vis.has(i);

        // Glow
        if (isVisited) {
            const grd = ctx.createRadialGradient(x, y, 0, x, y, 12);
            grd.addColorStop(0, c.node + '55');
            grd.addColorStop(1, 'transparent');
            ctx.beginPath();
            ctx.arc(x, y, 12, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fillStyle = isVisited ? c.node : 'rgba(30,41,59,0.9)';
        ctx.strokeStyle = isVisited ? c.node : 'rgba(99,179,237,0.3)';
        ctx.lineWidth = 1.5;
        ctx.fill();
        ctx.stroke();
    });
}


/* ═══════════════════════════════════════════
   7. ALGO DEMO MODAL
═══════════════════════════════════════════ */
const AlgoModal = (() => {
    let modal, title, canvas, closeBtn, playBtn, stepBtn, resetBtn, speedInput, logEl, ctx;
    let current = null;
    let timer = null;
    let playing = false;
    let stepIdx = 0;

    // Graph definition for the demo
    const DEMO_NODES = [
        { id: 'S', x: 0.1, y: 0.5 },
        { id: 'A', x: 0.3, y: 0.2 },
        { id: 'B', x: 0.3, y: 0.8 },
        { id: 'C', x: 0.55, y: 0.2 },
        { id: 'D', x: 0.55, y: 0.8 },
        { id: 'E', x: 0.75, y: 0.5 },
        { id: 'T', x: 0.9, y: 0.5 },
    ];

    const DEMO_EDGES = [
        { a: 0, b: 1, w: 4 },
        { a: 0, b: 2, w: 2 },
        { a: 1, b: 3, w: 3 },
        { a: 1, b: 2, w: 1 },
        { a: 2, b: 4, w: 5 },
        { a: 3, b: 6, w: 2 },
        { a: 4, b: 5, w: 3 },
        { a: 5, b: 6, w: 1 },
        { a: 3, b: 5, w: 4 },
    ];

    const ALGO_STEPS = {
        dijkstra: [
            'Khởi tạo: khoảng cách S=0, tất cả còn lại = ∞',
            'Xét đỉnh S (d=0): cập nhật A=4, B=2',
            'Xét đỉnh B (d=2) — nhỏ nhất: cập nhật A=3, D=7',
            'Xét đỉnh A (d=3): cập nhật C=6',
            'Xét đỉnh C (d=6): cập nhật T=8, E=10',
            'Xét đỉnh D (d=7): cập nhật E=10',
            'Xét đỉnh T (d=8): ĐÃ ĐẾN ĐÍCH!',
            '✅ Đường đi ngắn nhất S→T = 8',
        ],
        bfs: [
            'Khởi tạo: queue=[S], visited={S}',
            'Dequeue S → thêm A, B vào queue. queue=[A,B]',
            'Dequeue A → thêm C. queue=[B,C]',
            'Dequeue B → thêm D. queue=[C,D]',
            'Dequeue C → thêm E, T. queue=[D,E,T]',
            'Dequeue D → không có neighbor mới. queue=[E,T]',
            'Dequeue E → không có neighbor mới. queue=[T]',
            '✅ Dequeue T — Tìm thấy đích!',
        ],
        dfs: [
            'Gọi DFS(S): thăm S, push stack. stack=[S]',
            'Đi sâu: thăm A. stack=[S,A]',
            'Đi sâu: thăm C. stack=[S,A,C]',
            'Đi sâu: thăm E. stack=[S,A,C,E]',
            'Đi sâu: thăm T — ĐÃ ĐẾN ĐÍCH!',
            '✅ Tìm thấy đường S→A→C→E→T',
        ],
        default: [
            'Khởi tạo thuật toán...',
            'Xử lý đỉnh nguồn...',
            'Mở rộng các đỉnh lân cận...',
            'Cập nhật trọng số/độ sâu...',
            'Tiếp tục duyệt...',
            '✅ Thuật toán hoàn thành!',
        ],
    };

    const VISITED_BY_STEP = [
        new Set([0]),
        new Set([0, 1, 2]),
        new Set([0, 1, 2, 4]),
        new Set([0, 1, 2, 3, 4]),
        new Set([0, 1, 2, 3, 4, 5]),
        new Set([0, 1, 2, 3, 4, 5, 6]),
        new Set([0, 1, 2, 3, 4, 5, 6]),
        new Set([0, 1, 2, 3, 4, 5, 6]),
    ];

    function render(vis = new Set([0])) {
        const W = canvas.width;
        const H = canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Background
        ctx.fillStyle = '#0b1120';
        ctx.fillRect(0, 0, W, H);

        // Edges
        DEMO_EDGES.forEach(({ a, b, w }) => {
            const n1 = DEMO_NODES[a];
            const n2 = DEMO_NODES[b];
            const isActive = vis.has(a) && vis.has(b);
            ctx.beginPath();
            ctx.moveTo(n1.x * W, n1.y * H);
            ctx.lineTo(n2.x * W, n2.y * H);
            ctx.strokeStyle = isActive ? 'rgba(34,211,238,0.6)' : 'rgba(99,179,237,0.12)';
            ctx.lineWidth = isActive ? 2 : 1.5;
            ctx.stroke();

            // Weight label
            const mx = ((n1.x + n2.x) / 2) * W;
            const my = ((n1.y + n2.y) / 2) * H;
            ctx.fillStyle = 'rgba(100,116,139,0.8)';
            ctx.font = '11px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.fillText(w, mx, my - 6);
        });

        // Nodes
        DEMO_NODES.forEach((n, i) => {
            const x = n.x * W;
            const y = n.y * H;
            const isVis = vis.has(i);
            const isCurr = vis.size > 0 && i === [...vis].pop();

            // Outer glow
            if (isVis) {
                const grad = ctx.createRadialGradient(x, y, 0, x, y, 22);
                grad.addColorStop(0, isCurr ? 'rgba(34,211,238,0.35)' : 'rgba(34,211,238,0.12)');
                grad.addColorStop(1, 'transparent');
                ctx.beginPath();
                ctx.arc(x, y, 22, 0, Math.PI * 2);
                ctx.fillStyle = grad;
                ctx.fill();
            }

            ctx.beginPath();
            ctx.arc(x, y, 18, 0, Math.PI * 2);
            ctx.fillStyle = isVis ? (isCurr ? 'rgba(34,211,238,0.3)' : 'rgba(34,211,238,0.12)') : 'rgba(17,24,39,0.9)';
            ctx.strokeStyle = isVis ? (isCurr ? '#22d3ee' : 'rgba(34,211,238,0.5)') : 'rgba(99,179,237,0.25)';
            ctx.lineWidth = isCurr ? 2.5 : 1.5;
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = isVis ? (isCurr ? '#22d3ee' : '#7dd3fc') : '#64748b';
            ctx.font = 'bold 13px JetBrains Mono, monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(n.id, x, y);
        });
    }

    function logStep(text) {
        const line = document.createElement('div');
        line.textContent = `› ${text}`;
        line.style.color = text.startsWith('✅') ? '#22d3ee' : '#94a3b8';
        logEl.appendChild(line);
        logEl.scrollTop = logEl.scrollHeight;
    }

    function step() {
        const algoKey = ALGO_STEPS[current] ? current : 'default';
        const steps = ALGO_STEPS[algoKey];
        if (stepIdx >= steps.length) return;

        const vis = VISITED_BY_STEP[Math.min(stepIdx, VISITED_BY_STEP.length - 1)];
        render(vis);
        logStep(steps[stepIdx]);
        stepIdx++;
    }

    function togglePlay() {
        playing = !playing;
        playBtn.textContent = playing ? '⏸ Pause' : '▶ Play';
        if (playing) {
            const interval = Math.max(300, 1500 - (parseInt(speedInput.value) - 1) * 140);
            timer = setInterval(() => {
                if (stepIdx >= (ALGO_STEPS[current] || ALGO_STEPS.default).length) {
                    clearInterval(timer);
                    playing = false;
                    playBtn.textContent = '▶ Play';
                    return;
                }
                step();
            }, interval);
        } else {
            clearInterval(timer);
        }
    }

    function reset() {
        clearInterval(timer);
        playing = false;
        stepIdx = 0;
        logEl.innerHTML = '';
        playBtn.textContent = '▶ Play';
        render(new Set([0]));
    }

    function open(algoName) {
        current = algoName.toLowerCase();
        title.textContent = algoName;
        modal.removeAttribute('hidden');
        reset();

        setTimeout(() => {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            render(new Set([0]));
        }, 50);
    }

    function close() {
        clearInterval(timer);
        modal.setAttribute('hidden', '');
        playing = false;
        playBtn.textContent = '▶ Play';
    }

    function init() {
        modal = document.getElementById('algo-modal');
        title = document.getElementById('modal-title');
        canvas = document.getElementById('demo-canvas');
        closeBtn = document.getElementById('modal-close');
        playBtn = document.getElementById('demo-play');
        stepBtn = document.getElementById('demo-step');
        resetBtn = document.getElementById('demo-reset');
        speedInput = document.getElementById('demo-speed');
        logEl = document.getElementById('demo-log');

        if (!modal || !canvas) return;
        ctx = canvas.getContext('2d');

        closeBtn.addEventListener('click', close);
        modal.addEventListener('click', e => { if (e.target === modal) close(); });
        playBtn.addEventListener('click', togglePlay);
        stepBtn.addEventListener('click', step);
        resetBtn.addEventListener('click', reset);

        document.querySelectorAll('.btn-algo-demo').forEach(btn => {
            btn.addEventListener('click', () => {
                const card = btn.closest('.algo-card-item');
                open(card.querySelector('h3').textContent);
            });
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') close();
        });
    }

    return { init };
})();


/* ═══════════════════════════════════════════
   8. CHAT SYSTEM
═══════════════════════════════════════════ */
const Chat = (() => {
    let input, sendBtn, messages, historyEl, newChatBtn, quickPrompts;

    /* ═══════════════════════════════════════════════════════════════
       DIJKSTRA SPECIALIST SYSTEM — getBotReply()
       Kiến trúc: Intent Detection → Structured Answer
       Phạm vi: Chỉ trả lời về thuật toán Dijkstra và các chủ đề liên quan trực tiếp.
    ═══════════════════════════════════════════════════════════════ */

    /**
     * Kiểm tra xem câu hỏi có liên quan đến Dijkstra không
     * bằng semantic keyword matching theo từng nhóm intent.
     */
    function detectIntent(lower) {
        // ── Intent groups: mỗi group là [tên_intent, [keywords]] ──
        const intents = [
            // 1. Tổng quan
            ['overview', ['dijkstra là gì', 'giới thiệu dijkstra', 'dijkstra hoạt động', 'ý tưởng dijkstra',
                'nguyên lý dijkstra', 'thuật toán dijkstra', 'khi nào dùng dijkstra',
                'dijkstra dùng để làm gì', 'dijkstra cho bài toán gì', 'tổng quan dijkstra',
                'greedy dijkstra', 'dijkstra greedy', 'dijkstra là']],

            // 2. Cạnh âm
            ['negative_edge', ['cạnh âm', 'trọng số âm', 'negative edge', 'negative weight',
                'tại sao không xử lý', 'vì sao không xử lý', 'dijkstra sai khi',
                'hạn chế dijkstra', 'điểm yếu dijkstra', 'bellman ford so với',
                'khi nào dùng bellman', 'bellman-ford']],

            // 3. Chứng minh đúng đắn
            ['proof', ['chứng minh', 'proof', 'invariant', 'tính đúng đắn', 'correctness',
                'greedy đúng', 'tại sao dijkstra đúng', 'vì sao dijkstra đúng',
                'contradiction', 'induction', 'tối ưu cục bộ', 'tối ưu toàn cục']],

            // 4. Độ phức tạp
            ['complexity', ['độ phức tạp', 'time complexity', 'space complexity', 'big o',
                'o(v+e)', 'o(e log v)', 'fibonacci heap', 'binary heap', 'min heap',
                'adjacency list', 'adjacency matrix', 'ma trận kề', 'danh sách kề',
                'bộ nhớ dijkstra', 'hiệu năng dijkstra']],

            // 5. Tối ưu nâng cao
            ['advanced', ['early stop', 'dừng sớm', 'bidirectional', 'hai chiều', 'multi-source',
                'nhiều nguồn', 'lazy deletion', 'lazy delete', 'path reconstruction',
                'truy vết đường đi', 'tái tạo đường đi', 'tối ưu dijkstra',
                'cải tiến dijkstra', 'nâng cao dijkstra', 'a* so với', 'a star']],

            // 6. Edge cases
            ['edge_cases', ['đồ thị không liên thông', 'disconnected', 'self-loop', 'vòng lặp chính',
                'parallel edge', 'cạnh song song', 'memory constraint', 'giới hạn bộ nhớ',
                'trường hợp đặc biệt', 'edge case']],

            // ─────────────────────────
            // 5. Compare chi tiết
            // ─────────────────────────
            ['compare_bfs', [
                'dijkstra và bfs', 'dijkstra vs bfs',
                'bfs so với dijkstra'
            ]],

            ['compare_bellman', [
                'dijkstra và bellman', 'dijkstra vs bellman',
                'bellman ford so với dijkstra'
            ]],

            ['compare_astar', [
                'dijkstra và a*', 'dijkstra vs a*',
                'a* so với dijkstra', 'a star'
            ]],

            ['compare_prim', [
                'dijkstra và prim', 'dijkstra vs prim',
                'prim so với dijkstra'
            ]],

            // 8. Cài đặt / Code
            ['code', ['code dijkstra', 'cài đặt dijkstra', 'implement dijkstra', 'viết dijkstra',
                'python dijkstra', 'c++ dijkstra', 'c# dijkstra', 'pseudocode dijkstra',
                'code python', 'code c++', 'mã nguồn dijkstra', 'implementation']],

            // 9. Phân tích chuyên sâu
            ['deep_analysis', ['tại sao greedy', 'vì sao greedy', 'khi nào sai', 'dijkstra sai',
                'tính tối ưu', 'optimality', 'time-space tradeoff', 'trade-off',
                'phân tích dijkstra', 'sâu hơn', 'nâng cao hơn', 'chuyên sâu']],

            // 1.5 Ứng dụng thực tế
            ['real_world', [
                'ứng dụng thực tế',
                'ứng dụng dijkstra',
                'dijkstra dùng trong thực tế',
                'dijkstra dùng ở đâu',
                'dijkstra dùng để làm gì trong thực tế',
                'real world',
                'thực tế',
                'google maps',
                'routing',
                'game ai',
                'network routing',
                'ospf',
                'robotics',
                'logistics',
                'supply chain'
            ]],
        ];

        for (const [intent, keywords] of intents) {
            for (const kw of keywords) {
                if (lower.includes(kw)) return intent;
            }
        }

        // Nếu câu hỏi chứa "dijkstra" nhưng không khớp intent cụ thể → overview
        if (lower.includes('dijkstra')) return 'overview';

        return null; // Không liên quan
    }

    /**
     * Kho câu trả lời theo từng intent — mỗi câu trả lời được cấu trúc rõ ràng.
     */
    const DIJKSTRA_ANSWERS = {

        overview: `🔷 **DIJKSTRA — TỔNG QUAN**

**Định nghĩa:**
Thuật toán Dijkstra (Edsger W. Dijkstra, 1959) giải bài toán Single-Source Shortest Path (SSSP) trên đồ thị có trọng số **không âm**.

**Ý tưởng chính (Greedy):**
- Duy trì tập S = các đỉnh đã xác định được khoảng cách ngắn nhất.
- Ở mỗi bước, chọn đỉnh u ∉ S có dist[u] nhỏ nhất → thêm vào S.
- Relaxation: với mọi cạnh (u, v, w): nếu dist[u] + w < dist[v] thì cập nhật dist[v].
- Lặp đến khi S = V (tất cả đỉnh).

**Khi nào dùng:**
- Đồ thị có trọng số **≥ 0** (bắt buộc).
- Bài toán tìm đường: GPS, routing, game AI.
- Có thể dừng sớm khi tìm được đỉnh đích.

**Độ phức tạp cơ bản:**
- Với Binary Heap: **O((V + E) log V)**
- Với ma trận kề (naive): O(V²)

**Hạn chế:**
- Không xử lý cạnh âm → dùng Bellman-Ford.
- Không phát hiện chu trình âm.`,

        compare_prim: `
==================================================
DIJKSTRA với PRIM
==================================================

1. BẢN CHẤT
----------------------------------
- Dijkstra: Tìm đường đi ngắn nhất từ 1 nguồn.
- Prim: Tìm cây khung nhỏ nhất (Minimum Spanning Tree - MST).

2. MỤC TIÊU
----------------------------------
| Tiêu chí | Dijkstra | Prim |
|----------|----------|------|
| Bài toán | Shortest Path | Minimum Spanning Tree |
| Kết quả | dist từ source | Tổng trọng số nhỏ nhất |
| Cần source | Có | Không bắt buộc |
| Đảm bảo | Đường đi tối ưu | Cây không chu trình |

3. GIỐNG NHAU
----------------------------------
- Đều dùng Greedy
- Đều dùng Priority Queue
- Độ phức tạp giống nhau khi dùng Binary Heap

4. KHÁC NHAU CỐT LÕI
----------------------------------
Dijkstra tối ưu khoảng cách từ source.
Prim tối ưu tổng trọng số toàn bộ cây.

5. KHI NÀO DÙNG?
----------------------------------
- Cần đường đi ngắn nhất → Dijkstra
- Cần nối tất cả đỉnh với chi phí nhỏ nhất → Prim
`,


        negative_edge: `🔴 **DIJKSTRA VÀ CẠNH ÂM**

**Tại sao Dijkstra sai với cạnh âm?**
Dijkstra giả định: một khi đỉnh u được thêm vào tập S, dist[u] là chính xác và không thể cải thiện thêm.
Với cạnh âm, giả định này **vi phạm** vì đường đi qua cạnh âm có thể rút ngắn dist[u] sau khi u đã được "confirmed".

**Phản ví dụ:**
\`\`\`
A --5--> B --(-4)--> C
A --2--> C
\`\`\`
- Dijkstra chọn C ngay với dist[C]=2, "xác nhận" C.
- Nhưng đường A→B→C = 5 + (-4) = 1 < 2 → Dijkstra cho kết quả sai!

**So sánh với Bellman-Ford:**
| Tiêu chí | Dijkstra | Bellman-Ford |
|---|---|---|
| Cạnh âm | ❌ Không hỗ trợ | ✅ Hỗ trợ |
| Chu trình âm | ❌ | ✅ Phát hiện được |
| Độ phức tạp | O((V+E) log V) | O(V·E) |
| Tốc độ | Nhanh hơn | Chậm hơn |

**Kết luận:** Nếu đồ thị có cạnh âm → **Bellman-Ford**. Nếu cạnh âm + cần nhanh → **SPFA** (Shortest Path Faster Algorithm).`,

        proof: `📐 **CHỨNG MINH TÍNH ĐÚNG ĐẮN CỦA DIJKSTRA**

**Loop Invariant:**
Sau mỗi bước lặp, với mọi đỉnh u ∈ S: dist[u] = δ(s, u) (khoảng cách ngắn nhất thực sự từ nguồn s).

**Chứng minh (Proof by Contradiction):**
Giả sử khi thêm đỉnh u vào S, dist[u] ≠ δ(s, u).
Tức là tồn tại đường đi thực sự p: s →...→ x → y →...→ u với δ(s,u) < dist[u].

Xét điểm y đầu tiên trên p thuộc V\\S (chưa confirmed):
- δ(s, y) ≤ δ(s, u) < dist[u] (vì p là đường ngắn nhất)
- Khi x ∈ S được xử lý, y đã được relaxation → dist[y] = δ(s, y)
- dist[y] ≤ δ(s, u) ≤ dist[u]

Nhưng thuật toán chọn u vì dist[u] ≤ dist[y] → **mâu thuẫn!**

**Điều kiện cốt lõi (Greedy Property):**
Trọng số không âm đảm bảo: δ(s, u) ≤ δ(s, y) vì mọi cạnh trên đường từ y đến u đều không âm.
→ Đây là lý do cạnh âm phá vỡ chứng minh.

**Kết luận:** Dijkstra đúng khi và chỉ khi tất cả trọng số ≥ 0.`,

        complexity: `⏱️ **ĐỘ PHỨC TẠP CỦA DIJKSTRA**

**1. Naive (không dùng heap):**
- Cấu trúc: mảng dist[], tìm min bằng vòng lặp O(V)
- Thời gian: **O(V²)**
- Phù hợp: đồ thị dày (dense), V nhỏ

**2. Binary Heap (Priority Queue tiêu chuẩn):**
- Extract-min: O(log V) × V lần = O(V log V)
- Decrease-key: O(log V) × E lần = O(E log V)
- Tổng: **O((V + E) log V)**
- Phù hợp: đồ thị thưa (sparse), thực tế phổ biến nhất

**3. Fibonacci Heap (lý thuyết tối ưu):**
- Extract-min: O(log V) amortized
- Decrease-key: **O(1) amortized** (!)
- Tổng: **O(E + V log V)**
- Phù hợp: lý thuyết, E >> V; thực tế constant factor lớn

**Bộ nhớ:**
- Adjacency List: O(V + E)
- Adjacency Matrix: O(V²)

**Tóm tắt bảng:**
| Heap type | Time | Note |
|---|---|---|
| Không dùng heap | O(V²) | Dense graph |
| Binary heap | O((V+E) log V) | Phổ biến nhất |
| Fibonacci heap | O(E + V log V) | Tốt về lý thuyết |`,

        advanced: `🚀 **KỸ THUẬT TỐI ƯU NÂNG CAO**

**1. Early Stop (Dừng sớm):**
Nếu chỉ cần đường từ s đến t, dừng ngay khi t được extract khỏi heap.
→ Giảm thời gian thực tế đáng kể cho single-pair query.

**2. Bidirectional Dijkstra:**
Chạy đồng thời Dijkstra từ s (xuôi) và từ t (ngược).
Dừng khi hai vùng "gặp nhau".
→ Giảm không gian tìm kiếm ~50%, hiệu quả cho road networks.

**3. Multi-source Dijkstra:**
Khởi tạo heap với **nhiều đỉnh nguồn** cùng lúc (dist = 0 cho tất cả nguồn).
→ Giải bài toán: "khoảng cách từ mỗi đỉnh đến nguồn gần nhất".
→ Ứng dụng: Voronoi diagram trên đồ thị, facility location.

**4. Lazy Deletion:**
Thay vì decrease-key (phức tạp để implement), đẩy bản ghi mới vào heap và bỏ qua bản ghi cũ khi extract.
→ Heap có thể chứa bản ghi dư, nhưng vẫn đúng.
→ Implementation đơn giản hơn, hiệu năng thực tế tốt.
\`\`\`python
# Lazy deletion pattern
heapq.heappush(pq, (new_dist, v))
# Khi extract:
if d > dist[u]: continue  # bản ghi cũ, bỏ qua
\`\`\`

**5. Path Reconstruction (Truy vết đường đi):**
Duy trì mảng prev[]:
\`\`\`python
prev[v] = u  # khi relax cạnh (u,v)
# Truy vết ngược từ t về s:
path = []
node = t
while node != -1:
    path.append(node)
    node = prev[node]
path.reverse()
\`\`\``,

        edge_cases: `⚠️ **EDGE CASES TRONG DIJKSTRA**

**1. Đồ thị không liên thông (Disconnected):**
Các đỉnh không thể đến từ nguồn s sẽ có dist[v] = ∞ mãi mãi.
→ Xử lý: kiểm tra dist[v] == ∞ để biết v không đến được.

**2. Self-loop (Cạnh tự vòng u→u, weight w):**
- Nếu w ≥ 0: hoàn toàn vô hại, relaxation dist[u] + w ≥ dist[u] không cập nhật gì.
- Nếu w < 0: phát hiện chu trình âm → Dijkstra không phù hợp.

**3. Parallel Edges (Nhiều cạnh giữa 2 đỉnh):**
Dijkstra tự nhiên xử lý đúng — relaxation sẽ chọn cạnh có trọng số nhỏ hơn.
Không cần tiền xử lý, chỉ cần thêm tất cả cạnh vào adjacency list.

**4. Memory Constraints:**
Với đồ thị cực lớn (V, E lên đến hàng tỷ):
- Dùng implicit graph (tính neighbors on-the-fly thay vì lưu adjacency list).
- Dùng bidirectional Dijkstra để giảm không gian active nodes.
- Dùng contraction hierarchies cho road networks (MapReduce Dijkstra).

**5. Đỉnh nguồn = Đỉnh đích:**
dist[s→s] = 0. Path rỗng. Cần xử lý edge case này khi output.`,


        code: `💻 **CÀI ĐẶT DIJKSTRA — ĐA NGÔN NGỮ**

**Python (Lazy Deletion, chuẩn nhất):**
\`\`\`python
import heapq

def dijkstra(graph, src, V):
    dist = [float('inf')] * V
    dist[src] = 0
    pq = [(0, src)]  # (distance, vertex)
    prev = [-1] * V

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue  # lazy deletion: bỏ bản ghi cũ
        for v, w in graph[u]:
            if dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                heapq.heappush(pq, (dist[v], v))
    return dist, prev
\`\`\`

**C++ (Priority Queue):**
\`\`\`cpp
#include <bits/stdc++.h>
using namespace std;
typedef pair<int,int> pii;

vector<int> dijkstra(int V, vector<vector<pii>>& adj, int src) {
    vector<int> dist(V, INT_MAX);
    priority_queue<pii, vector<pii>, greater<pii>> pq;
    dist[src] = 0;
    pq.push({0, src});

    while (!pq.empty()) {
        auto [d, u] = pq.top(); pq.pop();
        if (d > dist[u]) continue;
        for (auto [v, w] : adj[u]) {
            if (dist[u] + w < dist[v]) {
                dist[v] = dist[u] + w;
                pq.push({dist[v], v});
            }
        }
    }
    return dist;
}
\`\`\`

**C# (.NET):**
\`\`\`csharp
using System.Collections.Generic;

int[] Dijkstra(List<(int v, int w)>[] graph, int src, int V) {
    int[] dist = new int[V];
    Array.Fill(dist, int.MaxValue);
    dist[src] = 0;

    var pq = new SortedSet<(int d, int v)>();
    pq.Add((0, src));

    while (pq.Count > 0) {
        var (d, u) = pq.Min; pq.Remove(pq.Min);
        if (d > dist[u]) continue;
        foreach (var (v, w) in graph[u]) {
            if (dist[u] + w < dist[v]) {
                pq.Remove((dist[v], v));
                dist[v] = dist[u] + w;
                pq.Add((dist[v], v));
            }
        }
    }
    return dist;
}
\`\`\`

**Pseudocode:**
\`\`\`
DIJKSTRA(G, s):
  dist[v] ← ∞ for all v; dist[s] ← 0
  PQ ← {(0, s)}
  WHILE PQ ≠ ∅:
    (d, u) ← EXTRACT-MIN(PQ)
    IF d > dist[u]: SKIP
    FOR each (u, v, w) in G:
      IF dist[u] + w < dist[v]:
        dist[v] ← dist[u] + w
        INSERT(PQ, (dist[v], v))
  RETURN dist
\`\`\``,

        deep_analysis: `🧠 **PHÂN TÍCH CHUYÊN SÂU DIJKSTRA**

**Tại sao Greedy đúng?**
Greedy thường không đúng. Dijkstra đúng vì có 2 tính chất đặc biệt:

1. **Optimal Substructure:** Đường đi ngắn nhất từ s→t chứa đường đi ngắn nhất giữa mọi cặp đỉnh trung gian.
2. **Non-negative weights:** Đảm bảo "confirmed" node không thể được cải thiện thêm. Đây là điều kiện **bắt buộc** để greedy đúng.

**Khi nào Dijkstra cho kết quả sai?**
- Cạnh âm → vi phạm greedy invariant.
- Chu trình âm → dist có thể giảm vô hạn.
- Đồ thị vô hướng với cạnh âm → cũng sai tương tự.

**Tính tối ưu (Optimality):**
Dijkstra tối ưu theo nghĩa: không thể tốt hơn O(E + V log V) trong mô hình comparison-based với đồ thị tổng quát (lower bound từ sorting). Fibonacci heap đạt được giới hạn này.

**Time-Space Tradeoff:**
- Lưu prev[] để reconstruct path → tốn thêm O(V) bộ nhớ.
- Bidirectional Dijkstra: giảm ~50% nodes explored, tăng code complexity.
- A* với heuristic tốt: giảm mạnh nodes explored, nhưng cần domain knowledge.
- Contraction Hierarchies: preprocessing O(V log V) → query O(log V), dùng trong Google Maps.

**Nhận xét về thực tế:**
Trong competitive programming, Binary Heap + Lazy Deletion là lựa chọn tối ưu về implementation cost và performance. Fibonacci Heap chỉ có giá trị lý thuyết vì constant factor lớn.`,

        real_world: `
🌎 ================================
ỨNG DỤNG THỰC TẾ CỦA THUẬT TOÁN DIJKSTRA
================================

🚗 Bản đồ & Điều hướng (Ví dụ: Google Maps)
- Tìm đường đi ngắn nhất trên mạng lưới giao thông.
- Tính toán tuyến tối ưu theo khoảng cách hoặc thời gian.
- Trong hệ thống lớn, thường kết hợp với Contraction Hierarchies để tăng tốc.

🎮 Trí tuệ nhân tạo trong Game
- Nhân vật NPC tìm đường đến mục tiêu.
- Di chuyển trên bản đồ dạng lưới (grid).
- Thường kết hợp với A* để tối ưu tốc độ tìm kiếm.

📡 Định tuyến mạng máy tính
- Giao thức OSPF sử dụng Dijkstra để tính toán đường đi ngắn nhất giữa các router.                                                                                                                                                                                                                                                                                                                 
- Xây dựng bảng định tuyến tối ưu trong mạng nội bộ.

🧠 Robot và Tự động hóa
- Lập kế hoạch chuyển động (Motion Planning).
- Tìm đường tránh vật cản trong môi trường thực.

📦 Logistics & Chuỗi cung ứng
- Tối ưu hóa tuyến giao hàng.
- Giảm chi phí vận chuyển và thời gian giao nhận.

💰 Phân tích tài chính
- Phát hiện cơ hội kinh doanh chênh lệch giá (Arbitrage) trên đồ thị tỷ giá.
- Ứng dụng trong phân tích thị trường và tối ưu hóa luồng tiền.
`,

        variants: `
🧬 ================================
CÁC BIẾN THỂ CỦA DIJKSTRA
================================

1️⃣ Multi-source Dijkstra
- Nhiều nguồn cùng lúc

2️⃣ Bidirectional Dijkstra
- Chạy từ s và t

3️⃣ 0-1 BFS
- Khi w ∈ {0,1}
- Dùng deque
- Time: O(V+E)

4️⃣ Dial’s Algorithm
- Khi w nhỏ (bounded integer)
- Time: O(V + E + C)

5️⃣ Radix Heap Dijkstra
- Integer weights
- Thực tế rất nhanh

6️⃣ Contraction Hierarchies
- Preprocessing heavy
- Query cực nhanh
`,

        compare_bfs: `
==================================================
DIJKSTRA với BFS
==================================================

1. BẢN CHẤT
----------------------------------
BFS = Dijkstra khi mọi trọng số = 1.

2. SO SÁNH
----------------------------------
| Tiêu chí |    Dijkstra    | BFS            |
|----------|----------------|----------------|
| Trọng số |       ≥ 0      | Không trọng số |
| Cấu trúc | Priority Queue | Queue          |
| Time     | O((V+E)logV)   | O(V+E)         |
| Kết quả  | Theo trọng số  | Theo số cạnh   |

3. KHI NÀO DÙNG?
----------------------------------
- w(e) = 1 → dùng BFS nhanh hơn
- Có trọng số khác nhau → dùng Dijkstra
`,

        compare_bellman: `
==================================================
DIJKSTRA với BELLMAN-FORD
==================================================

1. KHẢ NĂNG XỬ LÝ
----------------------------------
| Tiêu chí     | Dijkstra | Bellman-Ford |
|--------------|----------|--------------|
| Cạnh âm      |    ❌   |      ✅      |
| Chu trình âm |    ❌   |      ✅      |
| Time | O((V+E)logV) | O(VE) |

2. NHẬN XÉT
----------------------------------
- Dijkstra nhanh hơn nhiều
- Bellman-Ford tổng quát hơn

3. KHI NÀO DÙNG?
----------------------------------
Có cạnh âm → bắt buộc Bellman-Ford
`,


        compare_astar: `
==================================================
DIJKSTRA vs A*
==================================================

1. CÔNG THỨC
----------------------------------
A* = Dijkstra + heuristic

f(v) = g(v) + h(v)

2. SO SÁNH
----------------------------------
| Tiêu chí | Dijkstra | A* |
|----------|----------|----|
| Heuristic | Không | Có |
| Mục tiêu | All nodes | Single target |
| Speed | Trung bình | Nhanh hơn thực tế |

3. LƯU Ý
----------------------------------
Nếu h(v)=0 → A* trở thành Dijkstra

4. ỨNG DỤNG
----------------------------------
Game AI, GPS routing
`,



        fallback_dijkstra: `🤖 **DIJKSTRA SPECIALIST — Tôi có thể giúp bạn về:**

**Các chủ đề tôi hỗ trợ:**
- 📖 Tổng quan & nguyên lý hoạt động
- 🔴 Cạnh âm & so sánh Bellman-Ford
- 📐 Chứng minh tính đúng đắn (Proof of Correctness)
- ⏱️ Độ phức tạp: Binary Heap, Fibonacci Heap, Naive
- 🚀 Tối ưu nâng cao: Bidirectional, Multi-source, Early Stop
- ⚠️ Edge cases: disconnected graph, self-loop, parallel edges
- ⚖️ So sánh: Dijkstra vs BFS, Bellman-Ford, A*
- 💻 Cài đặt: Python, C++, C#, Pseudocode
- 🧠 Phân tích chuyên sâu: Greedy property, Optimality, Tradeoff

**Gợi ý câu hỏi:**
- "Tại sao Dijkstra không xử lý được cạnh âm?"
- "Độ phức tạp của Dijkstra với Fibonacci Heap?"
- "Viết code Dijkstra bằng Python"
- "So sánh Dijkstra và A*"
- "Chứng minh Dijkstra đúng"`,
    };

    /**
     * Hàm chính: phát hiện intent → trả lời có cấu trúc
     * @param {string} msg - Tin nhắn từ người dùng
     * @returns {string} - Câu trả lời đã được format
     */
    function getBotReply(msg) {
        const lower = msg.toLowerCase().trim();

        // Phát hiện intent
        const intent = detectIntent(lower);

        // Nếu không liên quan đến Dijkstra → thông báo phạm vi
        if (!intent) {
            return `⬡ **DIJKSTRA SPECIALIST**\n\nTôi được tối ưu hóa chuyên sâu để trả lời về **thuật toán Dijkstra** và các chủ đề liên quan trực tiếp.\n\nCâu hỏi của bạn có vẻ nằm ngoài phạm vi đó. Hãy thử hỏi về:\n- Nguyên lý, độ phức tạp, cài đặt Dijkstra\n- Cạnh âm, chứng minh, edge cases\n- So sánh Dijkstra với BFS / Bellman-Ford / A*\n\n💡 Gõ **"help"** hoặc **"dijkstra"** để xem danh sách chủ đề đầy đủ.`;
        }

        // Trả lời fallback tổng quát trong Dijkstra
        if (intent === 'overview' && (lower === 'dijkstra' || lower === 'help' || lower.length < 12)) {
            return DIJKSTRA_ANSWERS.fallback_dijkstra;
        }

        return DIJKSTRA_ANSWERS[intent] || DIJKSTRA_ANSWERS.fallback_dijkstra;
    }

    function formatMessage(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`([^`]+)`/g, `<code style="background:rgba(34,211,238,0.1);padding:2px 6px;border-radius:4px;font-family:JetBrains Mono,monospace;font-size:0.85em">$1</code>`)
            .replace(/\n/g, '<br>');
    }

    function addMessage(content, isUser = false, animate = true) {
        const msgDiv = document.createElement('div');
        msgDiv.classList.add('message', isUser ? 'user-message' : 'bot-message');

        const now = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

        if (isUser) {
            msgDiv.innerHTML = `
        <div class="msg-avatar user-avatar-msg">👤</div>
        <div class="msg-content">
          <div class="msg-name">Bạn</div>
          <div class="msg-bubble">${formatMessage(content)}</div>
          <div class="msg-time">${now}</div>
        </div>`;
        } else {
            msgDiv.innerHTML = `
        <div class="msg-avatar bot-avatar">⬡</div>
        <div class="msg-content">
          <div class="msg-name">AlgoAI</div>
          <div class="msg-bubble">${formatMessage(content)}</div>
          <div class="msg-time">${now}</div>
        </div>`;
        }

        messages.appendChild(msgDiv);
        messages.scrollTop = messages.scrollHeight;
    }

    function showTyping() {
        const typing = document.createElement('div');
        typing.classList.add('message', 'bot-message');
        typing.id = 'typing-indicator';
        typing.innerHTML = `
      <div class="msg-avatar bot-avatar">⬡</div>
      <div class="msg-content">
        <div class="msg-bubble typing-bubble">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>`;
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;
    }

    function removeTyping() {
        const t = document.getElementById('typing-indicator');
        if (t) t.remove();
    }

    function sendMessage(text) {
        if (!text.trim()) return;

        // Hide quick prompts
        document.getElementById('quick-prompts').style.display = 'none';

        addMessage(text, true);
        input.value = '';
        input.style.height = 'auto';

        showTyping();

        const delay = 800 + Math.random() * 800;
        setTimeout(() => {
            removeTyping();
            const reply = getBotReply(text);
            addMessage(reply, false);

            // Add to history
            const item = document.createElement('div');
            item.classList.add('history-item');
            item.innerHTML = `<span class="history-icon">💬</span><span>${text.slice(0, 28)}${text.length > 28 ? '…' : ''}</span>`;
            item.addEventListener('click', () => {
                document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
            historyEl.insertBefore(item, historyEl.firstChild);
        }, delay);
    }

    function init() {
        input = document.getElementById('chat-input');
        sendBtn = document.getElementById('chat-send');
        messages = document.getElementById('chat-messages');
        historyEl = document.getElementById('chat-history');
        newChatBtn = document.getElementById('new-chat-btn');
        quickPrompts = document.querySelectorAll('.quick-prompt');

        if (!input || !sendBtn || !messages) {
            console.error('Chat: Không tìm thấy các phần tử DOM cần thiết');
            return;
        }

        sendBtn.addEventListener('click', () => sendMessage(input.value));

        input.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(input.value);
            }
        });

        // Auto resize textarea
        input.addEventListener('input', () => {
            input.style.height = 'auto';
            input.style.height = Math.min(input.scrollHeight, 120) + 'px';
        });

        // Quick prompts
        quickPrompts.forEach(btn => {
            btn.addEventListener('click', () => {
                sendMessage(btn.dataset.prompt);
            });
        });

        // New chat
        newChatBtn.addEventListener('click', () => {
            messages.innerHTML = '';
            document.getElementById('quick-prompts').style.display = 'flex';
            addMessage('Xin chào! Tôi là **Dijkstra Specialist** — trợ lý AI chuyên sâu về thuật toán Dijkstra. Hãy hỏi tôi về: nguyên lý, độ phức tạp, cài đặt, chứng minh, edge cases, hoặc so sánh với các thuật toán khác!');
        });

        // History items
        document.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.history-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
            });
        });
    }

    return { init };
})();


/* ═══════════════════════════════════════════
   9. FAQ ACCORDION
═══════════════════════════════════════════ */
const FAQ = (() => {
    function init() {
        document.querySelectorAll('.faq-q').forEach(btn => {
            btn.addEventListener('click', () => {
                const item = btn.closest('.faq-item');
                const isOpen = item.classList.contains('open');

                // Close all
                document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

                // Toggle current
                if (!isOpen) item.classList.add('open');
            });
        });
    }

    return { init };
})();


/* ═══════════════════════════════════════════
   10. CONTACT FORM
═══════════════════════════════════════════ */
const ContactForm = (() => {
    function init() {
        const btn = document.querySelector('.btn-submit');
        if (!btn) return;

        btn.addEventListener('click', () => {
            const orig = btn.textContent;
            btn.textContent = '✓ Đã gửi thành công!';
            btn.style.background = 'linear-gradient(90deg,#10b981,#059669)';
            setTimeout(() => {
                btn.textContent = orig;
                btn.style.background = '';
            }, 3000);
        });
    }

    return { init };
})();


/* ═══════════════════════════════════════════
   11. PROFILE — ANIMATE PROGRESS BARS
═══════════════════════════════════════════ */
function initProgressBars() {
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.querySelectorAll('.progress-fill').forEach(bar => {
                    const target = bar.style.width;
                    bar.style.width = '0%';
                    setTimeout(() => { bar.style.width = target; }, 100);
                });
            }
        });
    }, { threshold: 0.3 });

    const section = document.getElementById('section-profile');
    if (section) observer.observe(section);
}


/* ═══════════════════════════════════════════
   12. BOOT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    BgCanvas.init();
    Router.init();
    Header.init();
    AlgoModal.init();
    Chat.init();
    FAQ.init();
    ContactForm.init();
    initProgressBars();

    // Resize canvas on canvas sections
    window.addEventListener('resize', () => {
        const vis = document.getElementById('section-visualize');
        if (vis && vis.classList.contains('active')) {
            document.querySelectorAll('.algo-preview-canvas').forEach(c => { c.dataset.drawn = ''; });
            initAlgoPreviews();
        }
    }, { passive: true });

    // Start hero graph and scroll reveal immediately
    setTimeout(() => {
        initHeroGraph();
        initScrollReveal();
    }, 100);
});