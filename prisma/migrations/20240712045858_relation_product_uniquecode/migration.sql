-- AddForeignKey
ALTER TABLE "uniquecode" ADD CONSTRAINT "uniquecode_productid_fkey" FOREIGN KEY ("productid") REFERENCES "product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
