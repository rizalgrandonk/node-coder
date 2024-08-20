import { useState } from "react";
import type { Product } from "@/types/product";

export const usePrintFormModal = () => {
  const [showProductModal, setShowProductModal] = useState(false);

  const getProductByBarcode = async (barcode: string) => {
    console.log("getProductByBarcode", barcode);
    const product: Product = {
      name: "SGM EKSPLOR SOYA MADU 400G",
      // received: "",
      // description: null,
      upc: "8999099923548",
      maxbuffer: 0,
      localminlevel: 0,
      localmaxlevel: 0,
      codekey: "SGMES400M",
      endqueue: 0,
      availableqty: 0,
      isactive: true,
      id: 1000068,
      cardboardwidth: 278,
      cardboardlength: 0,
      widthallowance: 10,
    };

    /**
     * 
     * name:SGM EKSPLOR SOYA MADU 400G
        received:
        description:
        upc:8999099923548
        maxbuffer:0
        localminlevel:0
        localmaxlevel:0
        codekey:SGMES400M
        endqueue:0
        availableqty:0
        isactive:true
        id:1000068
        cardboardwidth:278
        cardboardlength:0
        widthallowance:10
     */

    return product;
  };

  return {
    showProductModal,
    setShowProductModal,
    getProductByBarcode,
  };
};
