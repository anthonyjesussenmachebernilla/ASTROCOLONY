-- CreateEnum
CREATE TYPE "MissionStatus" AS ENUM ('IN_PROGRESS', 'VICTORY', 'DEFEAT');

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "MissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentTurn" INTEGER NOT NULL DEFAULT 1,
    "maxTurns" INTEGER NOT NULL DEFAULT 10,
    "scenarioId" TEXT NOT NULL,
    "randomSeed" INTEGER NOT NULL,
    "engineVersion" TEXT NOT NULL DEFAULT '1.0.0',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionState" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "energy" INTEGER NOT NULL,
    "oxygen" INTEGER NOT NULL,
    "radiationProtection" INTEGER NOT NULL,
    "food" INTEGER NOT NULL,
    "science" INTEGER NOT NULL,
    "crewHealth" INTEGER NOT NULL,
    "actionsTakenThisTurn" INTEGER NOT NULL DEFAULT 0,
    "actionsExecutedIds" JSONB NOT NULL DEFAULT '[]',
    "deferredEffects" JSONB NOT NULL DEFAULT '[]',
    "activeEvent" JSONB,
    "outcomeReason" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MissionState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionAction" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpaceEvent" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpaceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionEvent" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "spaceEventId" TEXT NOT NULL,
    "turn" INTEGER NOT NULL,
    "effect" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScientificSource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScientificSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mission_sessionId_idx" ON "Mission"("sessionId");

-- CreateIndex
CREATE INDEX "Mission_status_idx" ON "Mission"("status");

-- CreateIndex
CREATE UNIQUE INDEX "MissionState_missionId_key" ON "MissionState"("missionId");

-- CreateIndex
CREATE INDEX "MissionAction_missionId_turn_idx" ON "MissionAction"("missionId", "turn");

-- CreateIndex
CREATE UNIQUE INDEX "SpaceEvent_externalId_key" ON "SpaceEvent"("externalId");

-- CreateIndex
CREATE INDEX "SpaceEvent_eventType_observedAt_idx" ON "SpaceEvent"("eventType", "observedAt");

-- CreateIndex
CREATE INDEX "MissionEvent_missionId_turn_idx" ON "MissionEvent"("missionId", "turn");

-- CreateIndex
CREATE UNIQUE INDEX "ScientificSource_url_key" ON "ScientificSource"("url");

-- AddForeignKey
ALTER TABLE "MissionState" ADD CONSTRAINT "MissionState_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionAction" ADD CONSTRAINT "MissionAction_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionEvent" ADD CONSTRAINT "MissionEvent_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionEvent" ADD CONSTRAINT "MissionEvent_spaceEventId_fkey" FOREIGN KEY ("spaceEventId") REFERENCES "SpaceEvent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
