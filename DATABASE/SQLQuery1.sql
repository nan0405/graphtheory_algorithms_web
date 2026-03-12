

USE GRAPH;
GO

-- 2. Xóa bảng cũ nếu tồn tại (theo thứ tự để tránh lỗi khóa ngoại)
IF OBJECT_ID('dbo.QuizOptions', 'U') IS NOT NULL DROP TABLE dbo.QuizOptions;
IF OBJECT_ID('dbo.Quizzes', 'U') IS NOT NULL DROP TABLE dbo.Quizzes;
IF OBJECT_ID('dbo.Theories', 'U') IS NOT NULL DROP TABLE dbo.Theories;
IF OBJECT_ID('dbo.Graphs', 'U') IS NOT NULL DROP TABLE dbo.Graphs;
IF OBJECT_ID('dbo.Users', 'U') IS NOT NULL DROP TABLE dbo.Users;
GO

-- 3. Tạo bảng Users
CREATE TABLE dbo.Users (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    Role NVARCHAR(50) DEFAULT 'User',
    Status NVARCHAR(50) DEFAULT 'Active',
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

-- 4. Tạo bảng Theories (Lý thuyết)
CREATE TABLE dbo.Theories (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(MAX) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

-- 5. Tạo bảng Graphs (Đồ thị)
CREATE TABLE dbo.Graphs (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(255) NOT NULL,
    Nodes NVARCHAR(MAX) NOT NULL, -- Lưu trữ chuỗi JSON
    Links NVARCHAR(MAX) NOT NULL, -- Lưu trữ chuỗi JSON
    CreatedAt DATETIME2 DEFAULT GETDATE()
);

-- 6. Tạo bảng Quizzes (Câu hỏi trắc nghiệm)
CREATE TABLE dbo.Quizzes (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(MAX) NOT NULL,
    Question NVARCHAR(MAX) NOT NULL
);

-- 7. Tạo bảng QuizOptions (Lựa chọn cho câu hỏi)
-- Thiết lập ON DELETE CASCADE như trong AppDbContext.cs
CREATE TABLE dbo.QuizOptions (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    OptionText NVARCHAR(MAX) NOT NULL,
    IsCorrect BIT NOT NULL,
    QuizId INT NOT NULL,
    CONSTRAINT FK_QuizOptions_Quizzes FOREIGN KEY (QuizId) 
        REFERENCES dbo.Quizzes(Id) ON DELETE CASCADE
);
GO

-- 8. Chèn dữ liệu mẫu (Tùy chọn)
INSERT INTO dbo.Users (Name, Email, Role) VALUES (N'Admin', 'admin@algo.com', 'Admin');
INSERT INTO dbo.Theories (Title, Content) VALUES (N'Lý thuyết Đồ thị', N'Nội dung cơ bản về đồ thị...');
GO