-- CreateEnum
CREATE TYPE "BundleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BundleType" AS ENUM ('FIXED', 'CUSTOMIZABLE');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('PERCENTAGE_DISCOUNT', 'FIXED_PRICE', 'FIXED_TOTAL');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'SYNCING', 'SYNCED', 'FAILED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('VIEW', 'ADD_TO_CART', 'CHECKOUT', 'PURCHASE');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" TIMESTAMP(3),
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false,
    "refreshToken" TEXT,
    "refreshTokenExpires" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "shopifyGid" TEXT,
    "name" TEXT,
    "email" TEXT,
    "planName" TEXT,
    "countryCode" TEXT,
    "currencyCode" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopSettings" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "defaultPricingType" "PricingType" NOT NULL DEFAULT 'PERCENTAGE_DISCOUNT',
    "defaultDiscount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "widgetConfig" JSONB NOT NULL DEFAULT '{}',
    "onboardingDone" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bundle" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "status" "BundleStatus" NOT NULL DEFAULT 'DRAFT',
    "type" "BundleType" NOT NULL DEFAULT 'FIXED',
    "pricingType" "PricingType" NOT NULL DEFAULT 'PERCENTAGE_DISCOUNT',
    "pricingValue" DECIMAL(12,2) NOT NULL,
    "shopifyProductId" TEXT,
    "cartTransformId" TEXT,
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "syncError" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleComponentGroup" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "minSelect" INTEGER NOT NULL DEFAULT 1,
    "maxSelect" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BundleComponentGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleComponent" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "groupId" TEXT,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "position" INTEGER NOT NULL DEFAULT 0,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BundleComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleEvent" (
    "id" BIGSERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "sessionToken" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleSale" (
    "id" BIGSERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "revenue" DECIMAL(12,2) NOT NULL,
    "currencyCode" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BundleSale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BundleDailyStat" (
    "id" BIGSERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "addToCarts" INTEGER NOT NULL DEFAULT 0,
    "orders" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,

    CONSTRAINT "BundleDailyStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedWebhook" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" BIGSERIAL NOT NULL,
    "shopId" TEXT NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_shop_idx" ON "Session"("shop");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_domain_key" ON "Shop"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_shopifyGid_key" ON "Shop"("shopifyGid");

-- CreateIndex
CREATE INDEX "Shop_uninstalledAt_idx" ON "Shop"("uninstalledAt");

-- CreateIndex
CREATE UNIQUE INDEX "ShopSettings_shopId_key" ON "ShopSettings"("shopId");

-- CreateIndex
CREATE INDEX "Bundle_shopId_handle_idx" ON "Bundle"("shopId", "handle");

-- CreateIndex
CREATE INDEX "Bundle_shopId_status_idx" ON "Bundle"("shopId", "status");

-- CreateIndex
CREATE INDEX "Bundle_shopId_deletedAt_idx" ON "Bundle"("shopId", "deletedAt");

-- CreateIndex
CREATE INDEX "Bundle_shopifyProductId_idx" ON "Bundle"("shopifyProductId");

-- CreateIndex
CREATE INDEX "BundleComponentGroup_bundleId_idx" ON "BundleComponentGroup"("bundleId");

-- CreateIndex
CREATE INDEX "BundleComponent_bundleId_idx" ON "BundleComponent"("bundleId");

-- CreateIndex
CREATE INDEX "BundleComponent_groupId_idx" ON "BundleComponent"("groupId");

-- CreateIndex
CREATE INDEX "BundleComponent_productId_idx" ON "BundleComponent"("productId");

-- CreateIndex
CREATE INDEX "BundleEvent_bundleId_occurredAt_idx" ON "BundleEvent"("bundleId", "occurredAt");

-- CreateIndex
CREATE INDEX "BundleEvent_shopId_type_occurredAt_idx" ON "BundleEvent"("shopId", "type", "occurredAt");

-- CreateIndex
CREATE INDEX "BundleSale_bundleId_occurredAt_idx" ON "BundleSale"("bundleId", "occurredAt");

-- CreateIndex
CREATE INDEX "BundleSale_shopId_occurredAt_idx" ON "BundleSale"("shopId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "BundleSale_orderId_bundleId_key" ON "BundleSale"("orderId", "bundleId");

-- CreateIndex
CREATE INDEX "BundleDailyStat_shopId_date_idx" ON "BundleDailyStat"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "BundleDailyStat_bundleId_date_key" ON "BundleDailyStat"("bundleId", "date");

-- CreateIndex
CREATE INDEX "ProcessedWebhook_shopDomain_idx" ON "ProcessedWebhook"("shopDomain");

-- CreateIndex
CREATE INDEX "ProcessedWebhook_processedAt_idx" ON "ProcessedWebhook"("processedAt");

-- CreateIndex
CREATE INDEX "AuditLog_shopId_createdAt_idx" ON "AuditLog"("shopId", "createdAt");

-- AddForeignKey
ALTER TABLE "ShopSettings" ADD CONSTRAINT "ShopSettings_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bundle" ADD CONSTRAINT "Bundle_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleComponentGroup" ADD CONSTRAINT "BundleComponentGroup_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleComponent" ADD CONSTRAINT "BundleComponent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleComponent" ADD CONSTRAINT "BundleComponent_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "BundleComponentGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleEvent" ADD CONSTRAINT "BundleEvent_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleEvent" ADD CONSTRAINT "BundleEvent_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleSale" ADD CONSTRAINT "BundleSale_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleSale" ADD CONSTRAINT "BundleSale_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleDailyStat" ADD CONSTRAINT "BundleDailyStat_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BundleDailyStat" ADD CONSTRAINT "BundleDailyStat_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "Bundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
