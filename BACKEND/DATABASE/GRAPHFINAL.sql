

USE GRAPHFINAL;
GO



CREATE TABLE dbo.Users (
    Id INT IDENTITY PRIMARY KEY,
    Email NVARCHAR(100) NOT NULL,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash NVARCHAR(255) NOT NULL,
    Role NVARCHAR(20) NOT NULL -- ADMIN | USER
);


CREATE TABLE dbo.Algorithms (
    Id INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(50) NOT NULL,
    Description NVARCHAR(255) NULL
);


CREATE TABLE dbo.Graphs (
    Id UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255) NULL,
    CreatedAt DATETIME DEFAULT GETDATE()
);


CREATE TABLE dbo.Nodes (
    Id INT IDENTITY PRIMARY KEY,
    GraphId UNIQUEIDENTIFIER NOT NULL,
    Label NVARCHAR(20) NOT NULL,
    X FLOAT NULL,
    Y FLOAT NULL,

    CONSTRAINT FK_Nodes_Graphs
        FOREIGN KEY (GraphId) REFERENCES dbo.Graphs(Id)
);


CREATE TABLE dbo.Edges (
    Id INT IDENTITY PRIMARY KEY,
    GraphId UNIQUEIDENTIFIER NOT NULL,
    FromNode NVARCHAR(20) NOT NULL,
    ToNode NVARCHAR(20) NOT NULL,
    Weight INT NOT NULL,
    IsDirected BIT NULL,

    CONSTRAINT FK_Edges_Graphs
        FOREIGN KEY (GraphId) REFERENCES dbo.Graphs(Id)
);


CREATE TABLE dbo.Quizzes (
    Id INT IDENTITY PRIMARY KEY,
    AlgorithmId INT NOT NULL,
    Question NVARCHAR(500) NOT NULL,

    CONSTRAINT FK_Quizzes_Algorithms
        FOREIGN KEY (AlgorithmId) REFERENCES dbo.Algorithms(Id)
);


CREATE TABLE dbo.QuizAnswers (
    Id INT IDENTITY PRIMARY KEY,
    QuizId INT NOT NULL,
    AnswerText NVARCHAR(255) NOT NULL,
    IsCorrect BIT NOT NULL,

    CONSTRAINT FK_QuizAnswers_Quizzes
        FOREIGN KEY (QuizId) REFERENCES dbo.Quizzes(Id)
);


CREATE TABLE dbo.Theories (
    Id INT IDENTITY PRIMARY KEY,
    AlgorithmId INT NOT NULL,
    Title NVARCHAR(200) NOT NULL,
    Content NVARCHAR(MAX) NOT NULL,

    CONSTRAINT FK_Theories_Algorithms
        FOREIGN KEY (AlgorithmId) REFERENCES dbo.Algorithms(Id)
);


CREATE TABLE dbo.UserTests (
    Id INT IDENTITY PRIMARY KEY,
    UserId INT NOT NULL,
    AlgorithmId INT NOT NULL,
    TotalQuestions INT NOT NULL,
    CorrectAnswers INT NOT NULL,
    Score FLOAT NOT NULL,
    StartedAt DATETIME DEFAULT GETDATE(),
    FinishedAt DATETIME NULL,

    CONSTRAINT FK_UserTests_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id),
    CONSTRAINT FK_UserTests_Algorithms
        FOREIGN KEY (AlgorithmId) REFERENCES dbo.Algorithms(Id)
);


CREATE TABLE dbo.UserTestAnswers (
    Id INT IDENTITY PRIMARY KEY,
    UserTestId INT NOT NULL,
    QuizId INT NOT NULL,
    SelectedAnswerId INT NULL,
    IsCorrect BIT NOT NULL,

    CONSTRAINT FK_UserTestAnswers_Test
        FOREIGN KEY (UserTestId) REFERENCES dbo.UserTests(Id),
    CONSTRAINT FK_UserTestAnswers_Quiz
        FOREIGN KEY (QuizId) REFERENCES dbo.Quizzes(Id),
    CONSTRAINT FK_UserTestAnswers_Answer
        FOREIGN KEY (SelectedAnswerId) REFERENCES dbo.QuizAnswers(Id)
);


CREATE TABLE dbo.Games (
    Id INT IDENTITY PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Description NVARCHAR(255) NULL,
    IsActive BIT DEFAULT 1
);


CREATE TABLE dbo.GameSessions (
    Id INT IDENTITY PRIMARY KEY,
    GameId INT NOT NULL,
    UserId INT NOT NULL,
    StartedAt DATETIME DEFAULT GETDATE(),
    FinishedAt DATETIME NULL,
    TotalScore INT DEFAULT 0,

    CONSTRAINT FK_GameSessions_Games
        FOREIGN KEY (GameId) REFERENCES dbo.Games(Id),
    CONSTRAINT FK_GameSessions_Users
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id)
);


CREATE TABLE dbo.GameQuizAnswers (
    Id INT IDENTITY PRIMARY KEY,
    GameSessionId INT NOT NULL,
    QuizId INT NOT NULL,
    SelectedAnswerId INT NULL,
    IsCorrect BIT NOT NULL,
    ScoreEarned INT NOT NULL,

    CONSTRAINT FK_GameQuizAnswers_Session
        FOREIGN KEY (GameSessionId) REFERENCES dbo.GameSessions(Id),
    CONSTRAINT FK_GameQuizAnswers_Quiz
        FOREIGN KEY (QuizId) REFERENCES dbo.Quizzes(Id),
    CONSTRAINT FK_GameQuizAnswers_Answer
        FOREIGN KEY (SelectedAnswerId) REFERENCES dbo.QuizAnswers(Id)
);


CREATE TABLE dbo.GameLeaderboard (
    Id INT IDENTITY PRIMARY KEY,
    GameId INT NOT NULL,
    UserId INT NOT NULL,
    BestScore INT NOT NULL,
    LastPlayedAt DATETIME NOT NULL,

    CONSTRAINT FK_Leaderboard_Game
        FOREIGN KEY (GameId) REFERENCES dbo.Games(Id),
    CONSTRAINT FK_Leaderboard_User
        FOREIGN KEY (UserId) REFERENCES dbo.Users(Id),
    CONSTRAINT UQ_Game_User UNIQUE (GameId, UserId)
);


