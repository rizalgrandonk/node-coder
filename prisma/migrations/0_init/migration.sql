-- SQLBook: Code
-- CreateTable
CREATE TABLE "ad_user" (
    "ad_user_id" DECIMAL(10,0) NOT NULL,
    "ad_client_id" DECIMAL(10,0) NOT NULL,
    "ad_org_id" DECIMAL(10,0) NOT NULL,
    "codekey" VARCHAR(50) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255),
    "password" VARCHAR(50) NOT NULL,
    "isactive" CHAR(1) NOT NULL DEFAULT 'Y',

    CONSTRAINT "ad_user_pkey" PRIMARY KEY ("ad_user_id")
);

-- CreateTable
CREATE TABLE "batch" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMP(6) NOT NULL,
    "sent" TIMESTAMP(6),
    "sendconfirmed" TIMESTAMP(6),
    "description" VARCHAR(255),
    "blockcodecount" INTEGER NOT NULL DEFAULT 0,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "endqueue" INTEGER NOT NULL DEFAULT 10,
    "printedqty" INTEGER NOT NULL DEFAULT 0,
    "batchno" VARCHAR(50),
    "printerlineid" INTEGER NOT NULL DEFAULT 0,
    "createdby" DECIMAL(10,0) NOT NULL DEFAULT 0,
    "updated" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedby" DECIMAL(10,0) NOT NULL DEFAULT 0,
    "productid" INTEGER NOT NULL,
    "isactive" BOOLEAN,
    "nik" VARCHAR,
    "triggercount" VARCHAR,
    "goodreadcount" VARCHAR,
    "noreadcount" VARCHAR,
    "matchcount" VARCHAR,
    "mismatchcount" VARCHAR,

    CONSTRAINT "amxc_batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "codererrorlog" (
    "id" SERIAL NOT NULL,
    "created" TIMESTAMP(6),
    "errormessage" VARCHAR(255) NOT NULL,
    "errortimestamp" TIMESTAMP(6),
    "batchno" VARCHAR(50),
    "sendconfirmed" TIMESTAMP(6),
    "batchid" INTEGER,
    "markingprinterid" INTEGER,

    CONSTRAINT "errorlog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coderpersonel" (
    "coderpersonel_id" DECIMAL(10,0) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "nik" VARCHAR(255) NOT NULL,
    "isactive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "coderpersonel_pkey" PRIMARY KEY ("coderpersonel_id")
);

-- CreateTable
CREATE TABLE "errorcode" (
    "errorcode" VARCHAR(10),
    "errorname" VARCHAR(200),
    "errordescription" VARCHAR(200)
);

-- CreateTable
CREATE TABLE "product" (
    "name" VARCHAR(255) NOT NULL,
    "received" TIMESTAMP(6),
    "description" VARCHAR(255),
    "upc" VARCHAR(30),
    "maxbuffer" INTEGER NOT NULL DEFAULT 0,
    "localminlevel" INTEGER NOT NULL DEFAULT 0,
    "localmaxlevel" INTEGER NOT NULL DEFAULT 1000000,
    "codekey" VARCHAR(45) NOT NULL,
    "endqueue" INTEGER,
    "availableqty" INTEGER NOT NULL DEFAULT 0,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "id" SERIAL NOT NULL,
    "cardboardwidth" DECIMAL,
    "cardboardlength" DECIMAL,
    "widthallowance" DECIMAL,

    CONSTRAINT "product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uniquecode" (
    "productid" INTEGER,
    "uniquecode" VARCHAR(15) NOT NULL DEFAULT '',
    "printed" TIMESTAMP(6),
    "received" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "batchid" INTEGER,
    "sent" TIMESTAMP(6),
    "sendconfirmed" TIMESTAMP(6),
    "buffered" TIMESTAMP(6),
    "printerlineid" INTEGER,
    "markingprinterid" INTEGER,
    "id" SERIAL NOT NULL,
    "isactive" BOOLEAN NOT NULL DEFAULT true,
    "coderstatus" VARCHAR(10),

    CONSTRAINT "UniqueCode_Key" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "_idxuniquecode" ON "uniquecode"("uniquecode");

-- CreateIndex
CREATE INDEX "uniquecode_idx" ON "uniquecode"("buffered", "productid", "markingprinterid");

