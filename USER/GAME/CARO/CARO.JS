const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const quizBox = document.getElementById("quizBox");
const scoreEl = document.getElementById("score");

let board = Array(9).fill(null);
let score = 0;
let gameOver = false;

const winPatterns = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

// Init board
for (let i = 0; i < 9; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.onclick = () => playerMove(i);
  boardEl.appendChild(cell);
}

function playerMove(index) {
  if (board[index] || gameOver) return;

  board[index] = "X";
  render();

  if (checkWin("X")) {
    score++;
    endGame("🎉 Bạn thắng! +1 điểm");
    return;
  }

  if (board.every(c => c)) {
    showQuiz();
    return;
  }

  aiMove();
}

function aiMove() {
  const empty = board
    .map((v, i) => v === null ? i : null)
    .filter(v => v !== null);

  const move = empty[Math.floor(Math.random() * empty.length)];
  board[move] = "O";
  render();

  if (checkWin("O")) {
    endGame("😢 Bạn thua!");
  }
}

function checkWin(player) {
  return winPatterns.some(p =>
    p.every(i => board[i] === player)
  );
}

function render() {
  document.querySelectorAll(".cell").forEach((c, i) => {
    c.textContent = board[i] || "";
  });
}

function endGame(msg) {
  gameOver = true;
  statusEl.textContent = msg;
  scoreEl.textContent = score;
  setTimeout(resetGame, 1500);
}

async function loadRandomQuestion() {
  try {
    const res = await fetch("http://localhost:5107/api/quizzes/random");
    const data = await res.json();

    quizBox.innerHTML = `
      <h3>${data.question}</h3>
      ${data.options.map(o =>
      `<button onclick="answer(${o.isCorrect})">${o.optionText}</button>`
    ).join("")}
    `;
  } catch (err) {
    console.error("Lỗi load câu hỏi:", err);
  }
}


function showQuiz() {
  gameOver = true;
  quizBox.classList.remove("hidden");
  loadRandomQuestion();   // 👈 thêm dòng này
}

function answer(correct) {
  quizBox.classList.add("hidden");

  if (correct) {
    score++;
    statusEl.textContent = "✔ Đúng! +1 điểm";
  } else {
    score--;
    statusEl.textContent = "✘ Sai! -1 điểm";
  }

  scoreEl.textContent = score;
  setTimeout(resetGame, 1200);
}

/* RESET */
function resetGame() {
  board.fill(null);
  gameOver = false;
  statusEl.textContent = "";
  render();
}
