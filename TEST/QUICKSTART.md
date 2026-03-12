# 🚀 Quick Start Guide - 5 Phút Chạy Được

## Option 1: Chạy Tự Động (Linux/Mac)

```bash
cd algorithm-visualizer-system
./start.sh
```

Xong! Truy cập:
- Admin: http://localhost:8080/admin.html
- Visualizer: http://localhost:8080/visualizer.html

---

## Option 2: Chạy Thủ Công

### Bước 1: Backend (Terminal 1)

```bash
cd backend/
pip install fastapi uvicorn pydantic
python main.py
```

### Bước 2: Frontend (Terminal 2)

```bash
cd frontend/
python -m http.server 8080
```

### Bước 3: Mở Trình Duyệt

- http://localhost:8080/admin.html
- http://localhost:8080/visualizer.html

---

## Option 3: Không Cần Backend (Đơn Giản Nhất)

Chỉ mở file HTML trực tiếp:

1. Mở `frontend/visualizer.html` trong Chrome/Firefox
2. Upload file `examples/dijkstra_example.json`
3. Bấm Play ▶️

---

## 🎯 Test Ngay

### Test 1: Xem Ví Dụ Dijkstra

1. Mở `visualizer.html`
2. Click "📁 Upload File JSON"
3. Chọn `examples/dijkstra_example.json`
4. Click "▶️ Chạy Thuật Toán"
5. Bấm nút mắt 👀 bên phải để xem giải thích

### Test 2: Tạo Thuật Toán Mới

1. Mở `admin.html`
2. Giữ nguyên form mặc định (đã có ví dụ Dijkstra)
3. Click "💾 Tải JSON Visualization" (không cần backend)
4. Lưu file JSON
5. Mở `visualizer.html` và upload file vừa tạo

### Test 3: Dùng Backend (Thông Minh Hơn)

1. Chạy backend: `cd backend && python main.py`
2. Mở `admin.html`
3. Viết mã giả:
   ```
   Khởi tạo queue [voice: Bắt đầu BFS]
   Thêm start vào queue
   Lặp khi queue không rỗng
   Lấy u từ queue
   Xét các đỉnh kề
   ```
4. Click "✨ Tạo Visualization"
5. Mở `visualizer.html` và upload JSON

---

## 📖 Mã Giả Đơn Giản

### Ví Dụ 1: BFS

```
Khởi tạo queue rỗng
Thêm start vào queue
Lặp khi queue không rỗng
  Lấy u từ queue
  Xét các đỉnh v kề với u
    Nếu v chưa visited
      Thêm v vào queue
```

### Ví Dụ 2: DFS

```
Khởi tạo stack rỗng
Thêm start vào stack
Lặp khi stack không rỗng
  Lấy u từ stack
  Xét các đỉnh v kề với u
    Nếu v chưa visited
      Thêm v vào stack
```

### Ví Dụ 3: Dijkstra (Ngắn Gọn)

```
Khởi tạo dist[start] = 0
Thêm start vào Open
Lặp khi Open không rỗng
  Lấy x từ Open có dist min
  Thêm x vào Close
  Với mỗi y kề x
    Cập nhật dist[y] nếu tốt hơn
```

---

## 🎨 Màu Sắc

- 🟡 Yellow: Chờ xét
- 🔴 Red: Đang xét
- 🟢 Green: Cập nhật
- 🔵 Blue: Đã chốt

---

## ❓ FAQ

**Q: Tôi không biết Python, làm sao?**
A: Dùng Option 3 - Không cần backend, chỉ cần trình duyệt!

**Q: Đồ thị không vẽ ra?**
A: Kiểm tra JSON có đúng format không. Xem file `examples/*.json`

**Q: Muốn thay đổi màu sắc?**
A: Sửa trong file JSON, trường `colors: ["yellow"]`

**Q: Backend báo lỗi?**
A: Cài lại dependencies: `pip install -r requirements.txt`

---

## 💡 Tips

1. **Bắt đầu đơn giản:** Upload file ví dụ trước
2. **Dùng [voice: ...]:** Thêm giải thích bằng giọng nói
3. **Màu blue = persist:** Màu xanh sẽ được giữ nguyên
4. **Drag nodes:** Kéo thả đỉnh để bố trí đẹp hơn
5. **Click steps:** Click vào từng bước để jump

---

## 🆘 Cần Giúp?

Đọc `README.md` để biết chi tiết đầy đủ!

**Happy Visualizing! 🎓**