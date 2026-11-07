CREATE TABLE "WorkspaceProfile" (
    "organisationId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL DEFAULT 'Owner',
    "contactEmail" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "preferences" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WorkspaceProfile_pkey" PRIMARY KEY ("organisationId")
);
ALTER TABLE "WorkspaceProfile" ADD CONSTRAINT "WorkspaceProfile_organisationId_fkey" FOREIGN KEY ("organisationId") REFERENCES "Organisation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
