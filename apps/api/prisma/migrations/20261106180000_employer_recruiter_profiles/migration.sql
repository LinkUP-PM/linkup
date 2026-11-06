-- CreateEnum
CREATE TYPE "HiringArea" AS ENUM (
  'TECHNOLOGY',
  'PRODUCT',
  'DATA',
  'DESIGN',
  'SALES',
  'OPERATIONS',
  'FINANCE',
  'HEALTH',
  'EDUCATION',
  'INDUSTRY',
  'SERVICES',
  'OTHER'
);

-- CreateEnum
CREATE TYPE "RecruiterWorkMode" AS ENUM ('CONSULTANCY', 'INDEPENDENT', 'IN_HOUSE');

-- CreateTable
CREATE TABLE "EmployerProfile" (
    "userId" TEXT NOT NULL,
    "tradeName" TEXT NOT NULL DEFAULT '',
    "legalName" TEXT NOT NULL DEFAULT '',
    "cnpj" TEXT,
    "industry" "HiringArea",
    "companySize" TEXT,
    "foundedYear" INTEGER,
    "website" TEXT,
    "linkedinUrl" TEXT,
    "about" TEXT,
    "livesInBrazil" BOOLEAN NOT NULL DEFAULT true,
    "cep" TEXT NOT NULL DEFAULT '',
    "street" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "contactName" TEXT NOT NULL DEFAULT '',
    "contactRole" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "commercialEmail" TEXT,
    "hiringAreasJson" JSONB NOT NULL DEFAULT '[]',
    "senioritiesJson" JSONB NOT NULL DEFAULT '[]',
    "contractTypesJson" JSONB NOT NULL DEFAULT '[]',
    "workModelsJson" JSONB NOT NULL DEFAULT '[]',
    "benefitsJson" JSONB NOT NULL DEFAULT '[]',
    "cultureValuesJson" JSONB NOT NULL DEFAULT '[]',
    "inclusionNote" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmployerProfile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "headline" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "linkedinUrl" TEXT,
    "state" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "bio" TEXT,
    "workMode" "RecruiterWorkMode",
    "consultancyName" TEXT,
    "consultancyWebsite" TEXT,
    "yearsExperience" INTEGER,
    "availability" TEXT,
    "focusAreasJson" JSONB NOT NULL DEFAULT '[]',
    "senioritiesJson" JSONB NOT NULL DEFAULT '[]',
    "contractTypesJson" JSONB NOT NULL DEFAULT '[]',
    "languagesJson" JSONB NOT NULL DEFAULT '[]',
    "certificatesJson" JSONB NOT NULL DEFAULT '[]',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("userId")
);

-- AddForeignKey
ALTER TABLE "EmployerProfile" ADD CONSTRAINT "EmployerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
