CREATE TABLE "AiGenerationUsage" (
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockToken" TEXT NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AiGenerationUsage_pkey" PRIMARY KEY ("userId", "day"),
    CONSTRAINT "AiGenerationUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
