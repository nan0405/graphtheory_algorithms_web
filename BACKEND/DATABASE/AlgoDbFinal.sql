USE master;
GO

IF DB_ID('AlgoDbFinal') IS NULL
    CREATE DATABASE AlgoDbFinal;
GO

USE AlgoDbFinal;
GO

/* ================= DROP THEO THỨ TỰ ================= */

IF OBJECT_ID('dbo.QuizOptions', 'U') IS NOT NULL
    DROP TABLE dbo.QuizOptions;

IF OBJECT_ID('dbo.Quizzes', 'U') IS NOT NULL
    DROP TABLE dbo.Quizzes;

IF OBJECT_ID('dbo.Graphs', 'U') IS NOT NULL
    DROP TABLE dbo.Graphs;

IF OBJECT_ID('dbo.Theories', 'U') IS NOT NULL
    DROP TABLE dbo.Theories;

IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL
    DROP TABLE dbo.Users;
GO

/* ================= CREATE LẠI ================= */

CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) DEFAULT 'User',
    Status NVARCHAR(50) DEFAULT 'Active',
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE dbo.Theories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(MAX) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE dbo.Graphs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    Nodes NVARCHAR(MAX) NOT NULL,
    Links NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

CREATE TABLE dbo.Quizzes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(MAX) NOT NULL,
    Question NVARCHAR(MAX) NOT NULL
);

CREATE TABLE dbo.QuizOptions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OptionText NVARCHAR(MAX) NOT NULL,
    IsCorrect BIT NOT NULL,
    QuizId INT NOT NULL,
    CONSTRAINT FK_QuizOptions_Quizzes
        FOREIGN KEY (QuizId)
        REFERENCES dbo.Quizzes(Id)
        ON DELETE CASCADE
);
GO



USE AlgoDbFinal;
GO

INSERT INTO dbo.Users (Name, Email, Role, Status)
VALUES
(N'Admin', 'admin@algo.com', 'Admin', 'Active'),
(N'Nguyễn Văn A', 'a@student.com', 'User', 'Active'),
(N'Trần Thị B', 'b@student.com', 'User', 'Active');

INSERT INTO dbo.Theories (Title, Content)
VALUES
(N'Lý thuyết đồ thị', N'Nội dung cơ bản về đồ thị'),
(N'Dijkstra', N'Tìm đường đi ngắn nhất');

INSERT INTO dbo.Quizzes (Title, Question)
VALUES
(N'Dijkstra', N'Dijkstra dùng để làm gì?'),
(N'Hamilton', N'Hamilton là gì?');

INSERT INTO dbo.QuizOptions (OptionText, IsCorrect, QuizId)
VALUES
(N'Tìm đường đi ngắn nhất', 1, 1),
(N'Tìm cây khung', 0, 1),
(N'Đi qua mỗi đỉnh đúng một lần', 1, 2),
(N'Có thể lặp đỉnh', 0, 2);
GO


SELECT * FROM dbo.Users;
SELECT * FROM dbo.Theories;
SELECT * FROM dbo.Quizzes;
SELECT * FROM dbo.QuizOptions;





USE AlgoDbFinal;
GO


DELETE FROM dbo.QuizOptions;
DELETE FROM dbo.Quizzes;
DBCC CHECKIDENT ('dbo.Quizzes', RESEED, 0);
DBCC CHECKIDENT ('dbo.QuizOptions', RESEED, 0);


/* ================= INSERT QUIZZES ================= */

INSERT INTO dbo.Quizzes (Title, Question) VALUES
(N'Dijkstra', N'Điều kiện để áp dụng thuật toán Dijkstra là gì?'),
(N'Dijkstra', N'Dijkstra dùng để tìm gì trong đồ thị?'),
(N'Dijkstra', N'Cấu trúc dữ liệu nào giúp tối ưu Dijkstra?'),
(N'Dijkstra', N'Dijkstra không áp dụng được khi nào?'),

(N'Prim', N'Thuật toán Prim dùng để làm gì?'),
(N'Prim', N'Prim bắt đầu từ đâu?'),
(N'Prim', N'Prim thuộc nhóm thuật toán nào?'),

(N'Kruskal', N'Kruskal dùng để làm gì?'),
(N'Kruskal', N'Kruskal cần cấu trúc dữ liệu nào để tránh chu trình?'),
(N'Kruskal', N'Kruskal chọn cạnh theo tiêu chí nào?'),

(N'DFS', N'DFS viết tắt của gì?'),
(N'DFS', N'DFS sử dụng cấu trúc dữ liệu nào?'),
(N'DFS', N'Ứng dụng của DFS là gì?'),

(N'BFS', N'BFS viết tắt của gì?'),
(N'BFS', N'BFS sử dụng cấu trúc dữ liệu nào?'),
(N'BFS', N'BFS giúp tìm gì trong đồ thị không trọng số?'),

(N'Euler', N'Chu trình Euler là gì?'),
(N'Euler', N'Điều kiện tồn tại chu trình Euler là gì?'),

(N'Hamilton', N'Chu trình Hamilton là gì?'),
(N'Hamilton', N'Khác biệt chính giữa Hamilton và Euler là gì?');
GO


/* ================= INSERT OPTIONS ================= */

INSERT INTO dbo.QuizOptions (OptionText, IsCorrect, QuizId) VALUES

-- 1
(N'Đồ thị có trọng số không âm',1,1),
(N'Đồ thị phải có chu trình',0,1),
(N'Đồ thị phải là cây',0,1),
(N'Đồ thị không liên thông',0,1),

-- 2
(N'Chu trình nhỏ nhất',0,2),
(N'Cây khung nhỏ nhất',0,2),
(N'Đường đi ngắn nhất từ một đỉnh',1,2),
(N'Số lượng cạnh',0,2),

-- 3
(N'Stack',0,3),
(N'Queue',0,3),
(N'Danh sách liên kết',0,3),
(N'Priority Queue (Min-Heap)',1,3),

-- 4
(N'Khi có trọng số bằng 1',0,4),
(N'Khi có cạnh âm',1,4),
(N'Khi đồ thị có hướng',0,4),
(N'Khi đồ thị có nhiều đỉnh',0,4),

-- 5
(N'Tìm cây khung nhỏ nhất',1,5),
(N'Tìm đường đi dài nhất',0,5),
(N'Tìm chu trình Euler',0,5),
(N'Tìm đường đi Hamilton',0,5),

-- 6
(N'Từ cạnh nhỏ nhất',0,6),
(N'Từ một đỉnh bất kỳ',1,6),
(N'Từ đỉnh có bậc lớn nhất',0,6),
(N'Từ đỉnh cuối cùng',0,6),

-- 7
(N'Chia để trị',0,7),
(N'Tham lam (Greedy)',1,7),
(N'Quy hoạch động',0,7),
(N'Nhánh cận',0,7),

-- 8
(N'Tìm đường đi ngắn nhất',0,8),
(N'Tìm cây khung nhỏ nhất',1,8),
(N'Tìm chu trình Euler',0,8),
(N'Tìm chu trình Hamilton',0,8),

-- 9
(N'Queue',0,9),
(N'Stack',0,9),
(N'Disjoint Set (Union-Find)',1,9),
(N'Mảng động',0,9),

-- 10
(N'Chọn cạnh lớn nhất',0,10),
(N'Chọn cạnh ngẫu nhiên',0,10),
(N'Chọn cạnh nhỏ nhất chưa tạo chu trình',1,10),
(N'Chọn cạnh nối nhiều đỉnh nhất',0,10),

-- 11
(N'Data First Search',0,11),
(N'Deep First Search',0,11),
(N'Depth First Search',1,11),
(N'Directed First Search',0,11),

-- 12
(N'Queue',0,12),
(N'Stack',1,12),
(N'Priority Queue',0,12),
(N'Heap',0,12),

-- 13
(N'Tìm cây khung nhỏ nhất',0,13),
(N'Kiểm tra liên thông, tìm thành phần liên thông',1,13),
(N'Tìm chu trình Euler',0,13),
(N'Tìm đường đi ngắn nhất có trọng số',0,13),

-- 14
(N'Best First Search',0,14),
(N'Breadth First Search',1,14),
(N'Binary First Search',0,14),
(N'Backward First Search',0,14),

-- 15
(N'Stack',0,15),
(N'Priority Queue',0,15),
(N'Queue',1,15),
(N'Heap',0,15),

-- 16
(N'Đường đi dài nhất',0,16),
(N'Đường đi ngắn nhất có trọng số',0,16),
(N'Tìm cây khung nhỏ nhất',0,16),
(N'Đường đi ngắn nhất trong đồ thị không trọng số',1,16),

-- 17
(N'Đi qua mỗi đỉnh đúng một lần',0,17),
(N'Đi qua mỗi cạnh đúng một lần và quay về điểm đầu',1,17),
(N'Đi qua mỗi đỉnh ít nhất một lần',0,17),
(N'Đi qua mỗi cạnh ít nhất hai lần',0,17),

-- 18
(N'Mọi đỉnh có bậc chẵn và đồ thị liên thông',1,18),
(N'Có ít nhất một chu trình',0,18),
(N'Đồ thị phải có hướng',0,18),
(N'Số cạnh chẵn',0,18),

-- 19
(N'Đi qua mỗi cạnh đúng một lần',0,19),
(N'Đi qua mỗi đỉnh đúng một lần và quay về điểm đầu',1,19),
(N'Đi qua mọi cạnh',0,19),
(N'Đi qua một số đỉnh',0,19),

-- 20
(N'Euler đi qua đỉnh, Hamilton đi qua cạnh',0,20),
(N'Euler và Hamilton giống nhau',0,20),
(N'Hamilton đi qua cạnh, Euler đi qua đỉnh',0,20),
(N'Euler đi qua mỗi cạnh, Hamilton đi qua mỗi đỉnh',1,20);

GO






/* ================= INSERT QUIZZES 21–50 ================= */

INSERT INTO dbo.Quizzes (Title, Question) VALUES
(N'Dijkstra', N'Độ phức tạp của Dijkstra khi dùng Min-Heap là gì?'), --21
(N'Dijkstra', N'Dijkstra thuộc nhóm chiến lược giải thuật nào?'),
(N'Dijkstra', N'Mảng dist trong Dijkstra dùng để làm gì?'),
(N'Dijkstra', N'Khi nào ta dừng thuật toán Dijkstra?'),

(N'Prim', N'Prim có thể áp dụng cho loại đồ thị nào?'),
(N'Prim', N'Độ phức tạp của Prim khi dùng Min-Heap là gì?'),
(N'Prim', N'Sự khác nhau chính giữa Prim và Kruskal là gì?'),

(N'Kruskal', N'Độ phức tạp của Kruskal phụ thuộc chủ yếu vào bước nào?'),
(N'Kruskal', N'Kruskal có thể áp dụng cho đồ thị nào?'),
(N'Kruskal', N'Khi nào Kruskal dừng lại?'),

(N'DFS', N'DFS có thể được cài đặt bằng cách nào?'),
(N'DFS', N'Độ phức tạp của DFS là gì?'),
(N'DFS', N'DFS thường được dùng trong thuật toán nào sau đây?'),

(N'BFS', N'Độ phức tạp của BFS là gì?'),
(N'BFS', N'BFS duyệt các đỉnh theo thứ tự nào?'),
(N'BFS', N'BFS có thể dùng để kiểm tra điều gì?'),

(N'Euler', N'Đường đi Euler khác chu trình Euler ở điểm nào?'),
(N'Euler', N'Đồ thị có đúng 2 đỉnh bậc lẻ thì có gì?'),
(N'Euler', N'Ứng dụng của chu trình Euler là gì?'),

(N'Hamilton', N'Bài toán Hamilton thuộc loại bài toán gì?'),
(N'Hamilton', N'Kiểm tra chu trình Hamilton có độ phức tạp như thế nào?'),
(N'Hamilton', N'Bài toán người du lịch (TSP) liên quan đến thuật toán nào?'),

(N'Tổng hợp', N'Thuật toán nào dùng hàng đợi ưu tiên?'),
(N'Tổng hợp', N'Thuật toán nào dùng cấu trúc Stack?'),
(N'Tổng hợp', N'Thuật toán nào dùng Union-Find?'),
(N'Tổng hợp', N'Thuật toán nào tìm đường đi ngắn nhất trong đồ thị không trọng số?'),
(N'Tổng hợp', N'Thuật toán nào tìm cây khung nhỏ nhất?'),
(N'Tổng hợp', N'Thuật toán nào yêu cầu mọi đỉnh bậc chẵn để có chu trình?'),
(N'Tổng hợp', N'Thuật toán nào đảm bảo đi qua mỗi đỉnh đúng một lần?'),
(N'Tổng hợp', N'Thuật toán nào không hoạt động nếu có cạnh âm?');
GO


/* ================= INSERT OPTIONS 21–50 ================= */

INSERT INTO dbo.QuizOptions (OptionText, IsCorrect, QuizId) VALUES

--21
(N'O(V^2)',0,21),
(N'O(E log V)',1,21),
(N'O(V log V)',0,21),
(N'O(E^2)',0,21),

--22
(N'Quy hoạch động',0,22),
(N'Chia để trị',0,22),
(N'Tham lam (Greedy)',1,22),
(N'Nhánh cận',0,22),

--23
(N'Lưu khoảng cách ngắn nhất tạm thời từ nguồn',1,23),
(N'Lưu số cạnh',0,23),
(N'Lưu bậc của đỉnh',0,23),
(N'Lưu trọng số lớn nhất',0,23),

--24
(N'Khi tìm được 1 cạnh',0,24),
(N'Khi tất cả đỉnh đã được chọn hoặc đạt đỉnh đích',1,24),
(N'Khi có chu trình',0,24),
(N'Khi có cạnh âm',0,24),

--25
(N'Đồ thị có trọng số',1,25),
(N'Đồ thị không trọng số',0,25),
(N'Đồ thị có cạnh âm',0,25),
(N'Đồ thị rỗng',0,25),

--26
(N'O(E log V)',1,26),
(N'O(V^3)',0,26),
(N'O(E^2)',0,26),
(N'O(V!)',0,26),

--27
(N'Prim chọn cạnh toàn cục nhỏ nhất, Kruskal chọn từ 1 đỉnh',0,27),
(N'Prim mở rộng từ cây đang có, Kruskal chọn cạnh toàn cục nhỏ nhất',1,27),
(N'Giống nhau hoàn toàn',0,27),
(N'Prim không dùng trọng số',0,27),

--28
(N'Duyệt BFS',0,28),
(N'Sắp xếp cạnh theo trọng số',1,28),
(N'Duyệt DFS',0,28),
(N'Tính bậc đỉnh',0,28),

--29
(N'Đồ thị có trọng số',1,29),
(N'Đồ thị không cạnh',0,29),
(N'Chỉ đồ thị có hướng',0,29),
(N'Chỉ cây',0,29),

--30
(N'Khi đủ V-1 cạnh',1,30),
(N'Khi đủ V cạnh',0,30),
(N'Khi hết cạnh',0,30),
(N'Khi có chu trình',0,30),

--31
(N'Chỉ dùng đệ quy',0,31),
(N'Chỉ dùng vòng lặp',0,31),
(N'Dùng đệ quy hoặc Stack',1,31),
(N'Dùng Queue',0,31),

--32
(N'O(V + E)',1,32),
(N'O(V^2)',0,32),
(N'O(E^2)',0,32),
(N'O(log V)',0,32),

--33
(N'Topological Sort',1,33),
(N'Prim',0,33),
(N'Kruskal',0,33),
(N'Dijkstra',0,33),

--34
(N'O(V + E)',1,34),
(N'O(V^2)',0,34),
(N'O(E log V)',0,34),
(N'O(V!)',0,34),

--35
(N'Theo chiều sâu',0,35),
(N'Theo ngẫu nhiên',0,35),
(N'Theo từng mức (level-order)',1,35),
(N'Theo trọng số',0,35),

--36
(N'Tính chu trình Euler',0,36),
(N'Tính cây khung nhỏ nhất',0,36),
(N'Kiểm tra liên thông',1,36),
(N'Tìm Hamilton',0,36),

--37
(N'Đường đi không cần quay lại điểm đầu',1,37),
(N'Phải quay lại điểm đầu',0,37),
(N'Đi qua mỗi đỉnh',0,37),
(N'Không cần điều kiện',0,37),

--38
(N'Không có đường đi Euler',0,38),
(N'Có chu trình Euler',0,38),
(N'Có đường đi Euler nhưng không có chu trình',1,38),
(N'Không liên thông',0,38),

--39
(N'Thiết kế mạng điện',0,39),
(N'Bài toán vẽ hình một nét',1,39),
(N'Tìm cây khung',0,39),
(N'Tìm đường ngắn nhất',0,39),

--40
(N'P',0,40),
(N'NP-Complete',1,40),
(N'Logarithmic',0,40),
(N'Greedy',0,40),

--41
(N'O(V)',0,41),
(N'O(V + E)',0,41),
(N'Đa thức thấp',0,41),
(N'Tăng theo cấp số mũ (Exponential)',1,41),

--42
(N'Dijkstra',0,42),
(N'Euler',0,42),
(N'Hamilton',1,42),
(N'Prim',0,42),

--43
(N'Dijkstra',1,43),
(N'DFS',0,43),
(N'Euler',0,43),
(N'Hamilton',0,43),

--44
(N'BFS',0,44),
(N'DFS',1,44),
(N'Prim',0,44),
(N'Kruskal',0,44),

--45
(N'Prim',0,45),
(N'BFS',0,45),
(N'Kruskal',1,45),
(N'Hamilton',0,45),

--46
(N'Dijkstra',0,46),
(N'Prim',0,46),
(N'BFS',1,46),
(N'Euler',0,46),

--47
(N'Dijkstra và BFS',0,47),
(N'Prim và Kruskal',1,47),
(N'DFS và Euler',0,47),
(N'Hamilton và BFS',0,47),

--48
(N'Euler',1,48),
(N'Hamilton',0,48),
(N'Dijkstra',0,48),
(N'DFS',0,48),

--49
(N'Dijkstra',0,49),
(N'Hamilton',1,49),
(N'Prim',0,49),
(N'BFS',0,49),

--50
(N'Prim',0,50),
(N'Dijkstra',1,50),
(N'DFS',0,50),
(N'Euler',0,50);

GO


/* ================= INSERT QUIZZES 51–80 ================= */

INSERT INTO dbo.Quizzes (Title, Question) VALUES
(N'Dijkstra', N'Dijkstra hoạt động theo nguyên lý nào?'), --51
(N'Dijkstra', N'Nếu tất cả trọng số bằng nhau, Dijkstra tương đương thuật toán nào?'),
(N'Dijkstra', N'Biến visited trong Dijkstra dùng để làm gì?'),
(N'Dijkstra', N'Khi cập nhật dist[v], điều kiện nào phải thỏa?'),

(N'Prim', N'Prim tạo ra cấu trúc gì sau khi hoàn thành?'),
(N'Prim', N'Số cạnh của cây khung nhỏ nhất là bao nhiêu?'),
(N'Prim', N'Prim có thể áp dụng cho đồ thị không liên thông không?'),

(N'Kruskal', N'Kruskal sắp xếp cạnh theo thứ tự nào?'),
(N'Kruskal', N'Nếu thêm cạnh tạo chu trình thì Kruskal sẽ làm gì?'),
(N'Kruskal', N'Kruskal thuộc chiến lược nào?'),

(N'DFS', N'Thứ tự duyệt của DFS phụ thuộc vào điều gì?'),
(N'DFS', N'DFS có thể phát hiện điều gì trong đồ thị có hướng?'),
(N'DFS', N'DFS được dùng trong việc giải mê cung vì sao?'),

(N'BFS', N'Khoảng cách tính bằng BFS dựa trên yếu tố nào?'),
(N'BFS', N'BFS đảm bảo tìm đường ngắn nhất khi nào?'),
(N'BFS', N'BFS duyệt xong một mức thì làm gì tiếp?'),

(N'Euler', N'Đồ thị có chu trình Euler thì số đỉnh bậc lẻ là bao nhiêu?'),
(N'Euler', N'Để có đường đi Euler (không chu trình), số đỉnh bậc lẻ là bao nhiêu?'),
(N'Euler', N'Chu trình Euler tồn tại trong loại đồ thị nào?'),

(N'Hamilton', N'Chu trình Hamilton yêu cầu điều gì?'),
(N'Hamilton', N'Hamilton có thể dùng thuật toán tham lam đơn giản không?'),
(N'Hamilton', N'Khó khăn chính của bài toán Hamilton là gì?'),

(N'Tổng hợp', N'Thuật toán nào sử dụng chiến lược tham lam?'),
(N'Tổng hợp', N'Thuật toán nào dùng đệ quy phổ biến nhất?'),
(N'Tổng hợp', N'Thuật toán nào cần sắp xếp cạnh trước khi xử lý?'),
(N'Tổng hợp', N'Thuật toán nào phù hợp để tìm đường đi ngắn nhất có trọng số dương?'),
(N'Tổng hợp', N'Thuật toán nào duyệt theo chiều rộng?'),
(N'Tổng hợp', N'Thuật toán nào kiểm tra liên thông hiệu quả?'),
(N'Tổng hợp', N'Thuật toán nào áp dụng tốt cho bài toán vẽ một nét?'),
(N'Tổng hợp', N'Thuật toán nào có độ phức tạp thường là O(V+E)?');
GO


/**************** INSERT OPTIONS 51–80 ****************/

INSERT INTO dbo.QuizOptions (OptionText, IsCorrect, QuizId) VALUES

--51
(N'Chọn cạnh lớn nhất',0,51),
(N'Mở rộng dần tập đỉnh có khoảng cách nhỏ nhất',1,51),
(N'Duyệt theo chiều sâu',0,51),
(N'Sắp xếp cạnh toàn cục',0,51),

--52
(N'DFS',0,52),
(N'Prim',0,52),
(N'Kruskal',0,52),
(N'BFS',1,52),

--53
(N'Đánh dấu đỉnh đã xử lý xong',1,53),
(N'Lưu trọng số lớn nhất',0,53),
(N'Lưu số cạnh',0,53),
(N'Lưu bậc đỉnh',0,53),

--54
(N'dist[u] + weight < dist[v]',1,54),
(N'weight > dist[v]',0,54),
(N'dist[v] < 0',0,54),
(N'visited[v] = true',0,54),

--55
(N'Chu trình',0,55),
(N'Đường đi dài nhất',0,55),
(N'Cây khung nhỏ nhất',1,55),
(N'Đường đi Euler',0,55),

--56
(N'V',0,56),
(N'V-1',1,56),
(N'E',0,56),
(N'V+E',0,56),

--57
(N'Có, vẫn tạo được cây khung cho mỗi thành phần',1,57),
(N'Không bao giờ',0,57),
(N'Chỉ khi có cạnh âm',0,57),
(N'Chỉ với đồ thị có hướng',0,57),

--58
(N'Tăng dần theo trọng số',1,58),
(N'Giảm dần',0,58),
(N'Ngẫu nhiên',0,58),
(N'Theo bậc đỉnh',0,58),

--59
(N'Chấp nhận cạnh đó',0,59),
(N'Loại bỏ cạnh đó',1,59),
(N'Tăng trọng số',0,59),
(N'Đổi hướng cạnh',0,59),

--60
(N'Chia để trị',0,60),
(N'Quy hoạch động',0,60),
(N'Tham lam (Greedy)',1,60),
(N'Nhánh cận',0,60),

--61
(N'Trọng số cạnh',0,61),
(N'Số đỉnh',0,61),
(N'Thứ tự danh sách kề',1,61),
(N'Số cạnh',0,61),

--62
(N'Cạnh âm',0,62),
(N'Chu trình',1,62),
(N'Cây khung',0,62),
(N'Đường ngắn nhất',0,62),

--63
(N'Vì luôn đi ngắn nhất',0,63),
(N'Vì duyệt sâu đến khi hết đường rồi quay lui',1,63),
(N'Vì sắp xếp cạnh',0,63),
(N'Vì dùng heap',0,63),

--64
(N'Số cạnh tối đa',0,64),
(N'Số đỉnh',0,64),
(N'Số bước (cạnh) từ nguồn',1,64),
(N'Trọng số cạnh',0,64),

--65
(N'Khi có cạnh âm',0,65),
(N'Khi đồ thị không trọng số',1,65),
(N'Khi có heap',0,65),
(N'Khi có chu trình',0,65),

--66
(N'Quay lại nguồn',0,66),
(N'Dừng luôn',0,66),
(N'Chuyển sang duyệt mức tiếp theo',1,66),
(N'Sắp xếp lại hàng đợi',0,66),

--67
(N'0',1,67),
(N'1',0,67),
(N'2',0,67),
(N'4',0,67),

--68
(N'0',0,68),
(N'1',0,68),
(N'2',1,68),
(N'4',0,68),

--69
(N'Liên thông',1,69),
(N'Có hướng',0,69),
(N'Cạnh âm',0,69),
(N'Đủ V cạnh',0,69),

--70
(N'Đi qua mỗi cạnh',0,70),
(N'Đi qua mỗi đỉnh đúng một lần',1,70),
(N'Mọi đỉnh bậc chẵn',0,70),
(N'Không chu trình',0,70),

--71
(N'Có',0,71),
(N'Không, vì bài toán phức tạp cao',1,71),
(N'Chỉ với đồ thị nhỏ',0,71),
(N'Chỉ khi không có chu trình',0,71),

--72
(N'Thiếu bộ nhớ',0,72),
(N'Khó cài đặt',0,72),
(N'Độ phức tạp tăng rất nhanh theo số đỉnh',1,72),
(N'Cần heap',0,72),

--73
(N'Dijkstra, Prim, Kruskal',1,73),
(N'DFS, BFS',0,73),
(N'Euler',0,73),
(N'Hamilton',0,73),

--74
(N'BFS',0,74),
(N'DFS',1,74),
(N'Dijkstra',0,74),
(N'Prim',0,74),

--75
(N'DFS',0,75),
(N'Kruskal',1,75),
(N'BFS',0,75),
(N'Hamilton',0,75),

--76
(N'BFS',0,76),
(N'Dijkstra',1,76),
(N'DFS',0,76),
(N'Euler',0,76),

--77
(N'DFS',0,77),
(N'BFS',1,77),
(N'Prim',0,77),
(N'Hamilton',0,77),

--78
(N'Prim',0,78),
(N'DFS',1,78),
(N'Dijkstra',0,78),
(N'Hamilton',0,78),

--79
(N'Euler',1,79),
(N'Prim',0,79),
(N'Dijkstra',0,79),
(N'DFS',0,79),

--80
(N'Hamilton',0,80),
(N'DFS và BFS',1,80),
(N'Dijkstra',0,80),
(N'Euler',0,80);

GO