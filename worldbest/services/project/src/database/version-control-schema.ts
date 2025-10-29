// Database schema additions for version control
// This should be added to the main Prisma schema

/*
model ProjectVersion {
  id                String   @id @default(cuid())
  projectId         String
  artifactType      String   // 'content', 'metadata', 'structure'
  artifactId        String   // Specific artifact identifier
  versionNumber     Int
  parentVersionId   String?
  userId            String
  description       String?
  tags              String[]
  size              Int      // Size in bytes
  deltaType         String   // 'full' or 'delta'
  deltaData         String   // Compressed content or delta
  baseVersionId     String?  // For delta versions, points to base
  compressionRatio  Float    @default(1.0)
  checksum          String   // SHA256 checksum for integrity
  metadata          Json     @default("{}")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  project           Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user              User     @relation(fields: [userId], references: [id])
  parentVersion     ProjectVersion? @relation("VersionHierarchy", fields: [parentVersionId], references: [id])
  childVersions     ProjectVersion[] @relation("VersionHierarchy")
  baseVersion       ProjectVersion? @relation("DeltaChain", fields: [baseVersionId], references: [id])
  deltaVersions     ProjectVersion[] @relation("DeltaChain")

  @@unique([projectId, artifactType, artifactId, versionNumber])
  @@index([projectId, artifactType, artifactId])
  @@index([userId])
  @@index([createdAt])
  @@index([tags])
  @@map("ProjectVersion")
}

model ProjectBranch {
  id              String   @id @default(cuid())
  name            String
  projectId       String
  baseVersionId   String
  createdBy       String
  description     String?
  isActive        Boolean  @default(true)
  mergedAt        DateTime?
  mergedBy        String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  project         Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  baseVersion     ProjectVersion @relation(fields: [baseVersionId], references: [id])
  creator         User     @relation(fields: [createdBy], references: [id])
  merger          User?    @relation("BranchMerger", fields: [mergedBy], references: [id])

  @@unique([projectId, name])
  @@map("ProjectBranch")
}

model VersionConflict {
  id              String   @id @default(cuid())
  branchId        String
  artifactType    String
  artifactId      String
  conflictType    String   // 'content', 'metadata', 'structure'
  sourceContent   String
  targetContent   String
  resolvedContent String?
  resolvedBy      String?
  resolvedAt      DateTime?
  createdAt       DateTime @default(now())

  branch          ProjectBranch @relation(fields: [branchId], references: [id], onDelete: Cascade)
  resolver        User?    @relation(fields: [resolvedBy], references: [id])

  @@map("VersionConflict")
}

model VersionTag {
  id          String   @id @default(cuid())
  name        String
  description String?
  color       String?
  projectId   String
  createdBy   String
  createdAt   DateTime @default(now())

  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  creator     User     @relation(fields: [createdBy], references: [id])

  @@unique([projectId, name])
  @@map("VersionTag")
}
*/

// Migration script to add version control tables
export const addVersionControlTables = `
-- Add ProjectVersion table
CREATE TABLE "ProjectVersion" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "parentVersionId" TEXT,
    "userId" TEXT NOT NULL,
    "description" TEXT,
    "tags" TEXT[],
    "size" INTEGER NOT NULL,
    "deltaType" TEXT NOT NULL,
    "deltaData" TEXT NOT NULL,
    "baseVersionId" TEXT,
    "compressionRatio" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "checksum" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectVersion_pkey" PRIMARY KEY ("id")
);

-- Add ProjectBranch table
CREATE TABLE "ProjectBranch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "baseVersionId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mergedAt" TIMESTAMP(3),
    "mergedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectBranch_pkey" PRIMARY KEY ("id")
);

-- Add VersionConflict table
CREATE TABLE "VersionConflict" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "artifactType" TEXT NOT NULL,
    "artifactId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "sourceContent" TEXT NOT NULL,
    "targetContent" TEXT NOT NULL,
    "resolvedContent" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionConflict_pkey" PRIMARY KEY ("id")
);

-- Add VersionTag table
CREATE TABLE "VersionTag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "projectId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VersionTag_pkey" PRIMARY KEY ("id")
);

-- Add unique constraints
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_artifactType_artifactId_versionNumber_key" UNIQUE ("projectId", "artifactType", "artifactId", "versionNumber");
ALTER TABLE "ProjectBranch" ADD CONSTRAINT "ProjectBranch_projectId_name_key" UNIQUE ("projectId", "name");
ALTER TABLE "VersionTag" ADD CONSTRAINT "VersionTag_projectId_name_key" UNIQUE ("projectId", "name");

-- Add indexes
CREATE INDEX "ProjectVersion_projectId_artifactType_artifactId_idx" ON "ProjectVersion"("projectId", "artifactType", "artifactId");
CREATE INDEX "ProjectVersion_userId_idx" ON "ProjectVersion"("userId");
CREATE INDEX "ProjectVersion_createdAt_idx" ON "ProjectVersion"("createdAt");
CREATE INDEX "ProjectVersion_tags_idx" ON "ProjectVersion" USING GIN ("tags");

-- Add foreign key constraints
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_parentVersionId_fkey" FOREIGN KEY ("parentVersionId") REFERENCES "ProjectVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectVersion" ADD CONSTRAINT "ProjectVersion_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "ProjectVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ProjectBranch" ADD CONSTRAINT "ProjectBranch_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBranch" ADD CONSTRAINT "ProjectBranch_baseVersionId_fkey" FOREIGN KEY ("baseVersionId") REFERENCES "ProjectVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectBranch" ADD CONSTRAINT "ProjectBranch_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectBranch" ADD CONSTRAINT "ProjectBranch_mergedBy_fkey" FOREIGN KEY ("mergedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VersionConflict" ADD CONSTRAINT "VersionConflict_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "ProjectBranch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VersionConflict" ADD CONSTRAINT "VersionConflict_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VersionTag" ADD CONSTRAINT "VersionTag_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "VersionTag" ADD CONSTRAINT "VersionTag_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;

export default {
  addVersionControlTables
};