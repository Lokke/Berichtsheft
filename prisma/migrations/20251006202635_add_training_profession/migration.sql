-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT,
    "password" TEXT NOT NULL,
    "trainingClass" TEXT,
    "trainingProfessionId" TEXT,
    "trainingStartDate" DATETIME,
    "department" TEXT DEFAULT 'EDV',
    "mondayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "mondayHours" REAL NOT NULL DEFAULT 8.0,
    "tuesdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "tuesdayHours" REAL NOT NULL DEFAULT 8.0,
    "wednesdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "wednesdayHours" REAL NOT NULL DEFAULT 8.0,
    "thursdayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "thursdayHours" REAL NOT NULL DEFAULT 8.0,
    "fridayEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fridayHours" REAL NOT NULL DEFAULT 8.0,
    "saturdayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "saturdayHours" REAL NOT NULL DEFAULT 8.0,
    "sundayEnabled" BOOLEAN NOT NULL DEFAULT false,
    "sundayHours" REAL NOT NULL DEFAULT 8.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "User_trainingProfessionId_fkey" FOREIGN KEY ("trainingProfessionId") REFERENCES "TrainingProfession" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "activity" TEXT NOT NULL,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "week" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ActivityEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "description" TEXT NOT NULL,
    "duration" REAL,
    "order" INTEGER NOT NULL,
    "entryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActivityEntry_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TrainingProfession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_userId_date_key" ON "Entry"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingProfession_name_key" ON "TrainingProfession"("name");
