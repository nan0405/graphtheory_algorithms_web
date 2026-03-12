// --- DỮ LIỆU ---

let theoryData = [

    { id: 1, title: "Lý thuyết Đồ thị cơ bản", content: "Đồ thị là một tập hợp các đỉnh và cạnh..." },

    { id: 2, title: "Thuật toán Dijkstra", content: "Dùng để tìm đường đi ngắn nhất từ 1 đỉnh..." }

];



let quizData = [

    { id: 1, title: "Câu hỏi về BFS", question: "BFS sử dụng cấu trúc dữ liệu nào?", options: ["Stack", "Queue", "Heap"], correct: 1 }

];


function getNextAvailableId() {
    const existingIds = nodes.map(n => n.id);
    let charCode = 65; // Bắt đầu từ 'A'
    while (true) {
        let char = String.fromCharCode(charCode);
        if (!existingIds.includes(char)) {
            return char;
        }
        charCode++;
        // Giới hạn đến 'Z' (90), nếu muốn hơn có thể xử lý thêm
        if (charCode > 90) return "Node_" + (nodes.length + 1);
    }
}


let currentEditingType = null;

let currentEditingId = null;

let pendingEdge = null;

let pendingEdgeData = null;

let deletingNode = null;


// Thay đổi cổng 5000 thành 5107 theo như terminal của bạn
const API_BASE = "http://localhost:5107/api";

// --- TẢI DỮ LIỆU TỪ SERVER ---
async function loadDataFromServer() {
    try {
        const [theoryRes, quizRes, userRes] = await Promise.all([
            fetch(`${API_BASE}/theories`),
            fetch(`${API_BASE}/quizzes`),
            fetch(`${API_BASE}/users`)
        ]);

        theoryData = await theoryRes.json();
        quizData = await quizRes.json();
        const users = await userRes.json();

        renderTheory();
        renderQuiz();
        renderUsers(users);
    } catch (error) {
        console.error("Lỗi khi tải dữ liệu:", error);
    }
}

// --- GHI ĐÈ HÀM RENDER USERS ---
function renderUsers(users) {
    document.getElementById('user-list').innerHTML = users.map(u => `
        <tr>
            <td>#${u.id}</td>
            <td><strong>${u.name}</strong></td>
            <td>${u.email}</td>
            <td>${u.role}</td>
            <td><span style="color:green">● ${u.status}</span></td>
            <td><button class="btn-delete" onclick="deleteUser(${u.id})">Xóa</button></td>
        </tr>
    `).join('');
}

// --- LƯU DỮ LIỆU (ADD/EDIT) ---
async function saveModalData() {
    const title = document.getElementById('content-title').value;
    const content = quill.root.innerHTML;

    // Xác định loại nội dung và URL
    const isTheory = currentEditingType === 'theory';
    const endpoint = isTheory ? 'theories' : 'quizzes';
    let url = `${API_BASE}/${endpoint}`;

    // Tạo Payload
    let payload = { title };
    if (currentEditingId) {
        payload.id = currentEditingId; // Đưa ID vào để server biết là bản ghi cũ
    }

    if (isTheory) {
        payload.content = content;
    } else {
        const options = Array.from(document.querySelectorAll('.opt-text')).map((input, index) => ({
            // Nếu sửa Quiz, cần giữ lại QuizId cho Option
            quizId: currentEditingId || 0,
            optionText: input.value,
            isCorrect: document.querySelectorAll('input[name="ans"]')[index].checked
        }));
        payload.question = content;
        payload.options = options;
    }

    // Nếu có ID -> Dùng PUT để cập nhật, ngược lại dùng POST để tạo mới
    const method = currentEditingId ? 'PUT' : 'POST';
    if (currentEditingId) {
        url = `${url}/${currentEditingId}`;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            closeModal();
            loadDataFromServer();
            currentEditingId = null; // Reset ID sau khi xong
        } else {
            const error = await response.text();
            alert("Lỗi: " + error);
        }
    } catch (err) {
        console.error("Lỗi kết nối:", err);
    }
}

async function saveGraph() {
    const name = document.getElementById('g-name').value;
    if (!name) {
        alert("Vui lòng nhập tên đồ thị!");
        return;
    }

    // Chuẩn bị dữ liệu để lưu (biến nodes và links lấy từ logic đồ thị của bạn)
    const payload = {
        name: document.getElementById('g-name').value,
        // Lưu nguyên mảng nodes để giữ tọa độ x, y
        nodes: JSON.stringify(nodes),
        // Lưu links kèm theo weight và id của source/target
        links: JSON.stringify(links.map(l => ({
            source: l.source.id || l.source,
            target: l.target.id || l.target,
            weight: l.weight
        })))
    };

    try {
        const response = await fetch(`${API_BASE}/graphs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Lưu đồ thị thành công!");
            // Bạn có thể thêm hàm load danh sách đồ thị ở đây
        }
    } catch (error) {
        console.error("Lỗi khi lưu đồ thị:", error);
    }
}

// --- XÓA DỮ LIỆU ---
async function deleteItem(type, id) {
    if (!confirm("Bạn có chắc chắn muốn xóa?")) return;

    const endpoint = type === 'theory' ? 'theories' : 'quizzes';
    const response = await fetch(`${API_BASE}/${endpoint}/${id}`, { method: 'DELETE' });

    if (response.ok) {
        loadDataFromServer();
    } else {
        alert("Xóa thất bại!");
    }
}

// Khởi tạo lại khi load trang
document.addEventListener("DOMContentLoaded", () => {
    loadDataFromServer(); // Thay thế render cũ
    initQuill();
    updateSVGSize();
    renderGraph();
});



function initQuill() {

    quill = new Quill('#editor-container', { theme: 'snow', modules: { toolbar: [['bold', 'italic'], ['image', 'code-block']] } });

}


function openDeleteNodeOverlay(node) {
    deletingNode = node;

    document.getElementById("delete-node-text").innerText =
        `Bạn có chắc chắn muốn xóa đỉnh "${node.id}" và tất cả các cạnh liên quan?`;

    document.getElementById("delete-node-overlay").style.display = "flex";
}


function confirmDeleteNode() {
    if (!deletingNode) return;

    nodes = nodes.filter(n => n.id !== deletingNode.id);
    links = links.filter(l =>
        l.source.id !== deletingNode.id &&
        l.target.id !== deletingNode.id
    );

    deletingNode = null;
    closeDeleteNodeOverlay();
    renderGraph();
}

function closeDeleteNodeOverlay() {
    document.getElementById("delete-node-overlay").style.display = "none";
    deletingNode = null;
}




// Cập nhật kích thước màn đen theo chiều ngang/dọc của container

function updateSVGSize() {

    const container = document.querySelector('.canvas-container');

    const svgElement = document.getElementById('graph-svg');

    if (container && svgElement) {

        svgElement.setAttribute('width', container.clientWidth);

        svgElement.setAttribute('height', container.clientHeight);

    }

}

window.addEventListener('resize', () => {

    updateSVGSize();

    renderGraph();

});


function openEdgeWeightOverlay(source, target) {
    pendingEdgeData = { source, target };

    const overlay = document.getElementById('edge-weight-overlay');
    const input = document.getElementById('edge-weight-input');

    input.value = "";
    overlay.style.display = "flex";

    setTimeout(() => input.focus(), 50);
}

function confirmEdgeWeight() {
    const input = document.getElementById('edge-weight-input');
    const weight = input.value.trim();

    if (!weight || isNaN(weight) || Number(weight) <= 0) {
        input.focus();
        return;
    }

    links.push({
        source: pendingEdgeData.source,
        target: pendingEdgeData.target,
        weight: weight
    });

    closeEdgeOverlay();
    renderGraph();
}

function cancelEdgeWeight() {
    closeEdgeOverlay();
}



function closeEdgeOverlay() {
    document.getElementById('edge-weight-overlay').style.display = "none";
    pendingEdgeData = null;
}


document.addEventListener("keydown", e => {
    if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["I", "J", "C"].includes(e.key)) ||
        (e.ctrlKey && e.key === "U")
    ) {
        e.preventDefault();
    }
});



// --- QUẢN LÝ LÝ THUYẾT & TRẮC NGHIỆM ---

function switchTab(tabId) {

    document.querySelectorAll('.content-tab').forEach(t => t.classList.remove('active'));

    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));

    document.getElementById('tab-' + tabId).classList.add('active');

    event.currentTarget.classList.add('active');

}



function renderTheory() {

    document.getElementById('theory-list').innerHTML = theoryData.map(t => `

        <div class="content-item">

            <span>${t.title}</span>

            <div>

                <button class="btn-edit" onclick="editTheory(${t.id})">Sửa</button>

                <button class="btn-delete" onclick="deleteItem('theory', ${t.id})">Xóa</button>

            </div>

        </div>

    `).join('');

}



function createNewTheory() {

    currentEditingType = 'theory'; currentEditingId = null;

    document.getElementById('modal-title').innerText = "Thêm bài giảng Lý thuyết";

    document.getElementById('content-title').value = "";

    document.getElementById('quiz-options').style.display = 'none';

    quill.root.innerHTML = "";

    document.getElementById('modal-editor').style.display = 'flex';

}



function editTheory(id) {

    const item = theoryData.find(t => t.id === id);

    currentEditingType = 'theory'; currentEditingId = id;

    document.getElementById('modal-title').innerText = "Chỉnh sửa Lý thuyết";

    document.getElementById('content-title').value = item.title;

    document.getElementById('quiz-options').style.display = 'none';

    quill.root.innerHTML = item.content;

    document.getElementById('modal-editor').style.display = 'flex';

}



function renderQuiz() {

    document.getElementById('exercise-list').innerHTML = quizData.map(q => `

        <div class="content-item">

            <span>[Trắc nghiệm] ${q.title}</span>

            <div>

                <button class="btn-edit" onclick="editQuiz(${q.id})">Sửa</button>

                <button class="btn-delete" onclick="deleteItem('quiz', ${q.id})">Xóa</button>

            </div>

        </div>

    `).join('');

}



function createNewQuiz() {

    currentEditingType = 'quiz'; currentEditingId = null;

    document.getElementById('modal-title').innerText = "Tạo câu hỏi Trắc nghiệm";

    document.getElementById('content-title').value = "";

    document.getElementById('quiz-options').style.display = 'block';

    document.querySelectorAll('.opt-text').forEach(i => i.value = "");

    quill.root.innerHTML = "";

    document.getElementById('modal-editor').style.display = 'flex';

}



function editQuiz(id) {

    const item = quizData.find(q => q.id === id);

    currentEditingType = 'quiz'; currentEditingId = id;

    document.getElementById('modal-title').innerText = "Sửa Bài tập Trắc nghiệm";

    document.getElementById('content-title').value = item.title;

    document.getElementById('quiz-options').style.display = 'block';

    const optInputs = document.querySelectorAll('.opt-text');

    item.options.forEach((opt, i) => optInputs[i].value = opt);

    quill.root.innerHTML = item.question;

    document.getElementById('modal-editor').style.display = 'flex';

}







function closeModal() { document.getElementById('modal-editor').style.display = 'none'; }



// --- ĐỒ THỊ (DRAG & RIGHT CLICK) ---

let nodes = [], links = [], sourceNode = null, dragLine = null;

const svg = d3.select("#graph-svg");



function renderGraph() {

    svg.selectAll("*").remove();



    // 1. Vẽ các cạnh (links)

    svg.selectAll("line").data(links).enter().append("line")

        .attr("x1", d => d.source.x).attr("y1", d => d.source.y)

        .attr("x2", d => d.target.x).attr("y2", d => d.target.y)

        .attr("stroke", "#64748b").attr("stroke-width", 2);




    svg.selectAll(".weight-label").data(links).enter().append("text")

        .attr("class", "weight-text")

        .attr("x", d => (d.source.x + d.target.x) / 2)

        .attr("y", d => (d.source.y + d.target.y) / 2 - 10)

        .attr("text-anchor", "middle")
        .attr("fill", "#38bdf8")
        .text(d => d.weight);



    // 3. Vẽ các Node (Đỉnh)

    const gNodes = svg.selectAll("g.node").data(nodes).enter().append("g")

        .attr("class", "node")

        // NHÁY ĐÚP ĐỂ XÓA NODE & CẠNH

        .on("dblclick", (event, d) => {

            event.stopPropagation();

            openDeleteNodeOverlay(d);

        })

        .call(
            d3.drag()
                .filter(event => !event.shiftKey) // 🚫 giữ Shift thì KHÔNG drag
                .on("drag", (e, d) => {
                    d.x = e.x;
                    d.y = e.y;
                    renderGraph();
                })
        );




    gNodes.append("circle").attr("r", 22).attr("cx", d => d.x).attr("cy", d => d.y)

        .attr("fill", "#1e293b").attr("stroke", "#38bdf8").attr("stroke-width", 2);



    gNodes.append("text").attr("x", d => d.x).attr("y", d => d.y)

        .attr("text-anchor", "middle").attr("dy", ".35em").attr("fill", "#fff").text(d => d.id);

}



svg.on("mousedown", function (e) {
    const [x, y] = d3.pointer(e);
    const target = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 25);

    // ✅ SHIFT + CHUỘT TRÁI → NỐI CẠNH
    if (e.shiftKey && e.button === 0 && target) {
        e.preventDefault();

        sourceNode = target;
        dragLine = svg.append("line")
            .attr("stroke", "#38bdf8")
            .attr("stroke-dasharray", "5,5")
            .attr("x1", target.x)
            .attr("y1", target.y)
            .attr("x2", x)
            .attr("y2", y);

        return;
    }

    // ✅ CHUỘT TRÁI BÌNH THƯỜNG → THÊM NODE
    if (e.button === 0 && !target) {
        const nextId = getNextAvailableId(); // Gọi hàm tìm ID trống
        nodes.push({
            id: nextId,
            x, y
        });
        renderGraph();
    }
});






svg.on("mousemove", (e) => {
    if (dragLine) {
        const [x, y] = d3.pointer(e);
        dragLine.attr("x2", x).attr("y2", y);
    }
});



svg.on("mouseup", (e) => {
    if (!sourceNode) return;

    const [x, y] = d3.pointer(e);
    const target = nodes.find(n => Math.hypot(n.x - x, n.y - y) < 25);

    if (target && target !== sourceNode) {
        openEdgeWeightOverlay(sourceNode, target);
    }

    if (dragLine) dragLine.remove();
    sourceNode = null;
    dragLine = null;
});


svg.on("contextmenu", e => e.preventDefault());





function resetGraph() { nodes = []; links = []; renderGraph(); }


