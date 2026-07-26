-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Quiz" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "roomCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "organizerId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Quiz_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "imageUrl" TEXT,
    "type" TEXT NOT NULL,
    "timeLimit" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "quizId" INTEGER NOT NULL,
    CONSTRAINT "Question_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Option" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "text" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "questionId" INTEGER NOT NULL,
    CONSTRAINT "Option_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "questionId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "answeredAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Answer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Result" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "quizId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Result_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "Quiz" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Result_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_AnswerOptions" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_AnswerOptions_A_fkey" FOREIGN KEY ("A") REFERENCES "Answer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_AnswerOptions_B_fkey" FOREIGN KEY ("B") REFERENCES "Option" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Quiz_roomCode_key" ON "Quiz"("roomCode");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_questionId_userId_key" ON "Answer"("questionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "Result_quizId_userId_key" ON "Result"("quizId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "_AnswerOptions_AB_unique" ON "_AnswerOptions"("A", "B");

-- CreateIndex
CREATE INDEX "_AnswerOptions_B_index" ON "_AnswerOptions"("B");
