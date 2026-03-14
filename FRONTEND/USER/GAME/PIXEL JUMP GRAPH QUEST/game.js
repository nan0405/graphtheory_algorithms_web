const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const groundY = 380;
let score = 0;
let gameSpeed = 2.5;
let gamePaused = false;
let gameStarted = false;
const countdownEl = document.getElementById("countdown");
let minObstacleDistance = 520;
let shake = 0;

const scoreEl = document.getElementById("score");
const quizBox = document.getElementById("quizBox");
const questionEl = document.getElementById("question");

/* PLAYER */
const player = {
    x: 60,
    y: groundY - 40,
    width: 40,
    height: 40,
    vy: 0,
    gravity: 0.35,     // rơi chậm hơn
    jumpForce1: -7.2,  // nhảy thấp (1 lần)
    jumpForce2: -10.2, // nhảy cao (2 lần)
    maxFallSpeed: 7.5, // giới hạn tốc độ rơi
    jumpCount: 0,
    maxJump: 2,
};

/* OBSTACLES */
const obstacles = [];
const obstacleTypes = [
    { w: 40, h: 40 },
    { w: 40, h: 80 },
    { w: 60, h: 40 }
];

/* PARTICLES */
const particles = [];

/* CONTROLS */
window.addEventListener("keydown", e => {
    if (e.code === "Space" && !gamePaused) {
        if (player.jumpCount < player.maxJump) {
            player.vy = player.jumpCount === 0
                ? player.jumpForce1
                : player.jumpForce2;
            player.jumpCount++;
        }
    }
});

function loop() {
    if (gameStarted && !gamePaused) {
        update();
    }
    draw();
    requestAnimationFrame(loop);
}


/* UPDATE */
function update() {
    player.vy += player.gravity;
    if (player.vy > player.maxFallSpeed) {
        player.vy = player.maxFallSpeed;
    }

    player.y += player.vy;


    if (player.y >= groundY - player.height) {
        player.y = groundY - player.height;
        player.vy = 0;
        player.jumpCount = 0;
        player.scaleY = 0.85;
    }

    player.scaleY += (1 - player.scaleY) * 0.2;

    // Dust particles
    if (player.jumpCount === 0 && Math.random() < 0.3) {
        particles.push({
            x: player.x + 20,
            y: groundY,
            vx: -1 - Math.random(),
            vy: -Math.random() * 1.5,
            life: 20
        });
    }

    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if (p.life <= 0) particles.splice(i, 1);
    }

    // Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        o.x -= gameSpeed;

        if (
            player.x < o.x + o.w &&
            player.x + player.width > o.x &&
            player.y < o.y + o.h &&
            player.y + player.height > o.y
        ) {
            shake = 10;
            showQuiz();
            obstacles.splice(i, 1);
            return;
        }

        if (o.x + o.w < 0) {
            obstacles.splice(i, 1);
            score++;
            scoreEl.textContent = score;
        }
    }

    maybeSpawnObstacle();
}

function maybeSpawnObstacle() {
    if (obstacles.length === 0) {
        spawnObstacle();
        return;
    }
    const last = obstacles[obstacles.length - 1];
    if (canvas.width - last.x > minObstacleDistance) spawnObstacle();
}

function startCountdown() {
    let count = 3;
    countdownEl.textContent = count;
    countdownEl.style.opacity = 1;
    gamePaused = true;

    const timer = setInterval(() => {
        count--;

        if (count > 0) {
            countdownEl.textContent = count;
        } else if (count === 0) {
            countdownEl.textContent = "GO!";
        } else {
            clearInterval(timer);
            countdownEl.style.opacity = 0;
            gamePaused = false;
            gameStarted = true;
        }
    }, 1000);
}

/* DRAW */
function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (shake > 0) {
        ctx.translate((Math.random() - 0.5) * shake, 0);
        shake--;
    }

    // Ground
    ctx.fillStyle = "#2f4f2f";
    ctx.fillRect(0, groundY, canvas.width, 70);

    // Player
    drawPlayer();

    // Obstacles
    ctx.fillStyle = "#3b82f6";
    obstacles.forEach(o => ctx.fillRect(o.x, o.y, o.w, o.h));

    // Particles
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    particles.forEach(p => ctx.fillRect(p.x, p.y, 4, 4));

    ctx.restore();
}

/* PLAYER DRAW */
function drawPlayer() {
    const x = player.x;
    const y = player.y;
    const w = player.width;
    const h = player.height;

    ctx.save();
    ctx.translate(x + w / 2, y + h);
    ctx.scale(1, player.scaleY);
    ctx.translate(-w / 2, -h);

    ctx.fillStyle = "#ff6b81";
    ctx.fillRect(6, 10, 28, 28);

    ctx.fillRect(8, 0, 6, 14);
    ctx.fillRect(26, 0, 6, 14);

    ctx.fillStyle = "#fff";
    ctx.fillRect(14, 18, 4, 4);
    ctx.fillRect(22, 18, 4, 4);

    ctx.fillStyle = "#d94862";
    const leg = Math.sin(Date.now() / 100) * 4;
    ctx.fillRect(10 + leg, 34, 6, 6);
    ctx.fillRect(24 - leg, 34, 6, 6);

    ctx.restore();
}

/* OBSTACLE SPAWN */
function spawnObstacle() {
    const t = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    obstacles.push({
        x: canvas.width,
        y: groundY - t.h,
        w: t.w,
        h: t.h
    });
}

/* QUIZ */
async function showQuiz() {
    gamePaused = true;
    quizBox.classList.remove("hidden");
    quizBox.classList.add("show");

    // Hiển thị trạng thái đang tải
    questionEl.textContent = "Đang tải câu hỏi...";
    const buttonsContainer = quizBox.querySelectorAll('.answer');
    buttonsContainer.forEach(btn => btn.style.display = 'none');

    try {
        const response = await fetch('http://localhost:5107/api/quizzes/random');
        if (!response.ok) throw new Error("Lỗi kết nối API");

        const data = await response.json();
        // Cấu trúc data: { id, question, options: [{ optionText, isCorrect }, ...] }

        // Hiển thị câu hỏi
        questionEl.textContent = data.question;

        // Xóa các nút cũ và tạo nút mới dựa trên dữ liệu database
        // Tìm vị trí để chèn nút (xóa các nút cũ trừ thẻ h3)
        const oldButtons = quizBox.querySelectorAll('button.answer');
        oldButtons.forEach(btn => btn.remove());

        data.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'answer';
            btn.textContent = opt.optionText;
            // Truyền giá trị isCorrect vào hàm answer
            btn.onclick = () => answer(opt.isCorrect);
            quizBox.appendChild(btn);
        });

    } catch (error) {
        console.error("Lỗi:", error);
        questionEl.textContent = "Không thể tải câu hỏi. Nhấn để tiếp tục.";
        const retryBtn = document.createElement('button');
        retryBtn.className = 'answer';
        retryBtn.textContent = "Tiếp tục chơi";
        retryBtn.onclick = () => {
            quizBox.classList.add("hidden");
            gamePaused = false;
        };
        quizBox.appendChild(retryBtn);
    }
}

function answer(isCorrect) {
    // Hiển thị thông báo kết quả
    quizBox.innerHTML = isCorrect
        ? "<h2 style='color: #4ade80;'>✔ ĐÚNG RỒI!</h2>"
        : "<h2 style='color: #f87171;'>✘ SAI MẤT RỒI!</h2>";

    if (!isCorrect) {
        score = 0; // Reset điểm nếu sai (tùy theo logic game của bạn)
        scoreEl.textContent = score;
    } else {
        score += 5; // Thưởng thêm điểm nếu đúng
        scoreEl.textContent = score;
    }

    setTimeout(() => {
        quizBox.classList.add("hidden");
        quizBox.classList.remove("show");
        // Sau khi ẩn, reset lại nội dung ban đầu để sẵn sàng cho lần hiện sau
        resetQuizUI();
        gamePaused = false;
    }, 1200);
}

function resetQuizUI() {
    quizBox.innerHTML = `
        <h3 id="question">Đang chuẩn bị câu hỏi...</h3>
    `;
    // Gán lại biến questionEl vì innerHTML đã bị thay thế
    questionEl = document.getElementById("question");
}

function resetQuiz() {
    quizBox.innerHTML = `
    <h3 id="question">Thuật toán Prim dùng để làm gì?</h3>
    <button class="answer" onclick="answer(true)">Tìm cây khung nhỏ nhất</button>
    <button class="answer" onclick="answer(false)">Tìm đường đi ngắn nhất</button>
    <button class="answer" onclick="answer(false)">Duyệt tất cả đỉnh</button>
  `;
}

/* START */
loop();
startCountdown();