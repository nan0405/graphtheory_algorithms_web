# 🎓 Algorithm Visualizer System
## Hệ Thống Minh Họa Thuật Toán Thông Minh

> **Giải pháp hoàn hảo cho giáo viên/giáo sư**: Tạo visualization thuật toán chỉ bằng cách viết mã giả tự nhiên - Không cần biết lập trình!

---

## 🌟 Tính Năng Nổi Bật

### ✅ 6 Yêu Cầu Đã Đạt Được:

1. **✨ Nhận mã giả dạng tự nhiên** - Viết như khi giảng bài, không cần syntax phức tạp
2. **🧠 Phân tích cú pháp thông minh** - Backend Python tự động hiểu ý nghĩa
3. **🎯 Ánh xạ vào đồ thị bất kỳ** - Hỗ trợ mọi loại đồ thị (có hướng/vô hướng, có trọng số/không trọng số)
4. **🎬 Tự sinh animation** - Tự động tạo các bước visualization với màu sắc
5. **🚫 Không cần lập trình viên** - Giáo viên tự tạo được thuật toán mới
6. **🎨 Giữ nguyên cách vẽ đồ thị** - Tái sử dụng D3.js rendering chất lượng cao

---

## 📁 Cấu Trúc Dự Án

```
algorithm-visualizer-system/
├── backend/                    # Python FastAPI Backend
│   ├── main.py                # Smart Pseudocode Parser
│   └── requirements.txt       # Python dependencies
├── frontend/                   # HTML/CSS/JS Frontend
│   ├── admin.html             # Admin Interface (cho giáo viên)
│   ├── visualizer.html        # Visualization Interface
│   └── visualizer.js          # D3.js rendering logic
└── examples/                   # JSON examples
    ├── dijkstra_example.json  # Ví dụ Dijkstra
    └── bfs_example.json       # Ví dụ BFS
```

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy

### Bước 1: Cài Đặt Backend (Python)

```bash
cd backend/
pip install -r requirements.txt
python main.py
```

Backend sẽ chạy tại: `http://localhost:8000`

### Bước 2: Chạy Frontend

Mở file HTML trực tiếp trong trình duyệt:

```bash
cd frontend/
# Mở admin.html để tạo thuật toán
# Mở visualizer.html để xem visualization
```

Hoặc dùng HTTP server:

```bash
python -m http.server 8080
# Truy cập: http://localhost:8080/admin.html
```

---

## 📖 Hướng Dẫn Sử Dụng Cho Giáo Viên

### Phương Án 1: Dùng Backend (Khuyến Nghị)

**Bước 1: Mở Admin Interface**
- Mở `admin.html` trong trình duyệt

**Bước 2: Nhập Thông Tin Thuật Toán**
- Tên thuật toán: VD "Thuật toán Dijkstra"
- Mô tả: VD "Tìm đường đi ngắn nhất"
- Đồ thị JSON (định dạng đơn giản):

```json
{
  "nodes": ["a", "b", "c", "d"],
  "edges": [
    {"from": "a", "to": "b", "weight": 5},
    {"from": "b", "to": "c", "weight": 3}
  ]
}
```

**Bước 3: Viết Mã Giả Tự Nhiên**

Viết như khi giảng bài, mỗi dòng = 1 bước animation:

```
Khởi tạo dist[start] = 0, các đỉnh khác = vô cùng [voice: Bắt đầu thuật toán]
Thêm đỉnh start vào Open [voice: Thêm vào tập Open]
Lặp khi Open không rỗng
Lấy đỉnh x từ Open có dist nhỏ nhất [voice: Chọn đỉnh có khoảng cách nhỏ nhất]
Thêm x vào Close [voice: Đánh dấu hoàn thành]
Xét các đỉnh y kề với x
Nếu dist[y] > dist[x] + weight(x,y) thì cập nhật dist[y]
Kết thúc thuật toán [voice: Hoàn thành]
```

**Cú pháp đặc biệt:**
- `[voice: text]` - Thêm giải thích bằng giọng nói
- Từ khóa tự động nhận diện: `khởi tạo`, `thêm vào Open`, `lấy từ Open`, `đánh dấu Close`, `cập nhật dist`, `xét`, `lặp`, `kết thúc`

**Bước 4: Tạo Visualization**
- Bấm nút **"✨ Tạo Visualization"**
- Backend sẽ phân tích mã giả và tạo JSON
- File JSON tự động download

**Bước 5: Xem Animation**
- Mở `visualizer.html`
- Upload file JSON vừa tạo
- Bấm **"▶️ Chạy Thuật Toán"**

### Phương Án 2: Tạo JSON Thủ Công (Không cần Backend)

Nếu không muốn cài Python, có thể tạo JSON thủ công:

**Bước 1: Mở Admin Interface**
- Nhập thông tin thuật toán
- Viết mã giả (để ghi chú)

**Bước 2: Bấm "💾 Tải JSON Visualization"**
- Sẽ tạo JSON đơn giản từ mã giả
- File này có thể chỉnh sửa thủ công để thêm `highlight`

**Bước 3: Chỉnh Sửa JSON (tùy chọn)**

Mở file JSON và thêm thông tin highlight:

```json
{
  "step": "Bước 1",
  "pseudo": "Khởi tạo dist[a] = 0",
  "explain": "Bắt đầu thuật toán...",
  "voice": "Khởi tạo khoảng cách",
  "duration": 1500,
  "colors": ["yellow"],
  "highlight": {
    "nodes": ["a"],          // Tô màu đỉnh a
    "edges": ["a-b", "a-c"]  // Tô màu cạnh a-b và a-c
  }
}
```

**Quy ước màu:**
- `yellow` - Đỉnh/cạnh đang chờ xét
- `red` - Đỉnh đang được xử lý
- `green` - Đỉnh/cạnh được cập nhật
- `blue` - Đỉnh/cạnh đã hoàn thành (màu này sẽ được giữ nguyên)

---

## 🎨 Hiểu Về Hệ Thống

### Backend Parser Thông Minh

Backend Python (`main.py`) sử dụng **Regular Expression** và **Context Tracking** để:

1. **Phát hiện loại action** từ mã giả:
   - `init`: Khởi tạo
   - `add_open`: Thêm vào Open
   - `remove_open`: Lấy từ Open
   - `add_close`: Đánh dấu Close
   - `update_dist`: Cập nhật khoảng cách
   - `check_neighbor`: Xét đỉnh kề

2. **Tự động ánh xạ màu sắc**:
   - Mỗi loại action có màu mặc định
   - VD: `add_open` → màu vàng, `add_close` → màu xanh

3. **Extract biến từ mã giả**:
   - Tự động tìm tên đỉnh (a, b, c...)
   - Thay thế biến đặc biệt: `start`, `end`, `current`

4. **Generate explanation tự động**:
   - Nếu không có `[voice: ...]`, hệ thống tự tạo giải thích

### Frontend D3.js Rendering

Frontend (`visualizer.js`) **tái sử dụng 100%** logic vẽ đồ thị từ `dijkstra.js`:

- **D3 Force Simulation** - Tự động bố trí đỉnh
- **Color Transition** - Animation mượt mà
- **Persisted Blue State** - Giữ màu xanh cho đỉnh/cạnh đã chốt
- **Drag & Drop** - Kéo thả đỉnh tùy ý

---

## 🧪 Test Hệ Thống

### Test 1: Upload JSON Có Sẵn

1. Mở `visualizer.html`
2. Upload file `examples/dijkstra_example.json`
3. Bấm "▶️ Chạy Thuật Toán"
4. Quan sát animation

### Test 2: Tạo Thuật Toán Mới (Qua Backend)

1. **Chạy backend:**
   ```bash
   cd backend && python main.py
   ```

2. **Mở admin.html và nhập:**
   - Tên: "Test BFS"
   - Đồ thị: Dùng graph mặc định
   - Mã giả:
     ```
     Khởi tạo queue
     Thêm start vào queue
     Lặp khi queue không rỗng
     Lấy u từ queue
     Xét các đỉnh v kề với u
     Thêm v vào queue
     ```

3. **Bấm "✨ Tạo Visualization"**
4. **Upload JSON vào visualizer.html**

### Test 3: Tạo JSON Thủ Công

1. Mở `admin.html`
2. Bấm "💾 Tải JSON Visualization"
3. Mở file JSON vừa tải
4. Thêm `highlight` cho từng bước
5. Upload vào `visualizer.html`

---

## 🎯 Ví Dụ Mã Giả Cho Các Thuật Toán Khác

### DFS (Depth-First Search)

```
Khởi tạo stack rỗng [voice: Bắt đầu DFS]
Thêm start vào stack
Đánh dấu start visited
Lặp khi stack không rỗng
  Lấy u từ stack
  Xét các đỉnh v kề với u
    Nếu v chưa visited
      Đánh dấu v visited
      Thêm v vào stack
Kết thúc
```

### Prim (Minimum Spanning Tree)

```
Khởi tạo MST rỗng
Chọn đỉnh start bất kỳ
Thêm start vào MST
Lặp cho đến khi MST đủ n-1 cạnh
  Tìm cạnh nhẹ nhất nối MST với đỉnh ngoài
  Thêm cạnh đó vào MST
  Thêm đỉnh mới vào MST
Kết thúc - MST hoàn thành
```

### Kruskal (Minimum Spanning Tree)

```
Khởi tạo forest (mỗi đỉnh là một cây)
Sắp xếp các cạnh theo trọng số tăng dần
Với mỗi cạnh (u,v)
  Nếu u và v thuộc 2 cây khác nhau
    Thêm cạnh (u,v) vào MST
    Hợp nhất 2 cây
Kết thúc
```

---

## 🔧 Tùy Chỉnh & Mở Rộng

### Thêm Màu Sắc Mới

Trong `visualizer.js`, thêm vào `colorMap`:

```javascript
const colorMap = {
  'yellow': { node: '#ffc107', nodeStroke: '#b28900', edge: '#ffc107' },
  'purple': { node: '#9c27b0', nodeStroke: '#6a1b9a', edge: '#9c27b0' }  // Mới
};
```

### Thêm Action Pattern Mới

Trong `backend/main.py`, thêm vào `action_patterns`:

```python
self.action_patterns = {
    # ... existing patterns
    'merge': r'(hợp nhất|merge|union)',
    'split': r'(tách|split|divide)'
}
```

### Tùy Chỉnh Animation Speed

Trong `visualizer.html`, thay đổi range:

```html
<input type="range" id="speedSlider" min="200" max="5000" value="1000" />
```

---

## 📊 So Sánh Với Hệ Thống Cũ

| Tiêu Chí | Hệ Thống Cũ | Hệ Thống Mới |
|----------|-------------|--------------|
| **Input** | Code C#/Python | Mã giả tự nhiên |
| **Người dùng** | Lập trình viên | Giáo viên/Giáo sư |
| **Khó khăn** | Phải viết code visualization | Chỉ viết mã giả |
| **Linh hoạt** | Fixed algorithms | Bất kỳ thuật toán nào |
| **Backend** | C# service | Python FastAPI |
| **Tự động hóa** | Thủ công | Tự động parse & generate |

---

## 🐛 Troubleshooting

### Lỗi: "Backend không kết nối được"
- Kiểm tra backend đã chạy chưa: `python main.py`
- Kiểm tra port 8000 có bị chiếm không
- Đảm bảo CORS đã được enable trong backend

### Lỗi: "Đồ thị không vẽ ra"
- Kiểm tra JSON graph có đúng format không
- Đảm bảo `nodes` và `edges` không rỗng
- Xem console log để debug

### Lỗi: "Animation không chạy"
- Kiểm tra `steps` có trong JSON không
- Đảm bảo `highlight.nodes` và `highlight.edges` sử dụng đúng ID
- Kiểm tra console có lỗi JavaScript không

### Màu không đổi theo ý muốn
- Đảm bảo `colors` array có ít nhất 1 màu
- Kiểm tra `highlight.nodes` và `highlight.edges` có đúng ID không
- Xem lại quy ước màu: yellow/red/green/blue

---

## 🎓 Kịch Bản Sử Dụng Thực Tế

### Kịch Bản 1: Giáo Viên Dạy Thuật Toán Dijkstra

**Bước 1:** Giáo viên viết mã giả như cách giảng bài:
```
Khởi tạo khoảng cách từ A đến A là 0, các đỉnh khác vô cùng
Thêm A vào tập Open
...
```

**Bước 2:** Hệ thống tự động:
- Phân tích mã giả
- Tạo 18 bước visualization
- Thêm màu sắc tự động
- Generate giải thích

**Bước 3:** Trong lớp học:
- Mở visualizer.html trên projector
- Upload JSON vừa tạo
- Bấm Play → Sinh viên xem animation
- Bấm Pause → Giải thích chi tiết
- Click từng bước → Quay lại khi cần

### Kịch Bản 2: Sinh Viên Tự Học

**Sinh viên:**
1. Đọc giáo trình về BFS
2. Viết mã giả BFS theo cách hiểu của mình
3. Upload lên hệ thống
4. Xem visualization để kiểm tra hiểu đúng chưa
5. Nếu sai → Sửa mã giả → Upload lại

---

## 📚 API Documentation

### POST `/api/parse-algorithm`

**Request Body:**
```json
{
  "name": "Tên thuật toán",
  "description": "Mô tả",
  "pseudocode": [
    {"line": "Mã giả dòng 1", "voice": "Giải thích"},
    {"line": "Mã giả dòng 2", "voice": ""}
  ],
  "graph": {
    "nodes": ["a", "b"],
    "edges": [{"from": "a", "to": "b", "weight": 5}]
  },
  "start_node": "a",
  "end_node": "b"
}
```

**Response:**
```json
{
  "algorithm": {"name": "...", "description": "..."},
  "graph": {...},
  "steps": [
    {
      "step": "Bước 1",
      "pseudo": "...",
      "explain": "...",
      "voice": "...",
      "duration": 1500,
      "colors": ["yellow"],
      "highlight": {"nodes": [...], "edges": [...]}
    }
  ]
}
```

---

## 🚀 Phát Triển Tương Lai

### Phase 2: LLM Integration
- Sử dụng GPT/Claude để parse mã giả phức tạp hơn
- Tự động hiểu ngữ nghĩa sâu hơn
- Generate explanation chi tiết hơn

### Phase 3: Interactive Editor
- Drag-drop để tạo đồ thị
- Visual editor cho mã giả
- Real-time preview

### Phase 4: Sharing & Community
- Lưu thuật toán vào database
- Chia sẻ với cộng đồng
- Rating & comments

---

## 👨‍💻 Tác Giả & Đóng Góp

**Hệ thống được thiết kế đặc biệt cho:**
- Giáo viên/Giáo sư không chuyên về lập trình
- Sinh viên muốn tự học thuật toán
- Nhà nghiên cứu muốn trực quan hóa ý tưởng

**Công nghệ sử dụng:**
- Backend: Python 3.8+, FastAPI
- Frontend: HTML5, CSS3, JavaScript ES6+
- Visualization: D3.js v7
- Text-to-Speech: Web Speech API

---

## 📝 License

MIT License - Free to use for educational purposes

---

## 🙏 Lời Cảm Ơn

Cảm ơn bạn đã sử dụng Algorithm Visualizer System!

Nếu có câu hỏi hoặc góp ý, vui lòng tạo Issue trên GitHub.

**Happy Teaching! Happy Learning! 🎓**