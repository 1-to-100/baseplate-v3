-- CreateTable
CREATE TABLE "api_logs" (
    "id" SERIAL NOT NULL,
    "method" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "request_body" TEXT,
    "headers" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "api_logs_pkey" PRIMARY KEY ("id")
);
