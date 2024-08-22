import { useState } from "react";
import InputGroup from "@/components/input/InputGroup";
import Modal from "@/components/modal/Modal";
import { usePrintFormModal } from "../hooks/usePrintFormModal";
import { Product } from "@/types/product";
import FullPageLoading from "@/components/FullPageLoading";
import AlertBanner from "@/components/banner/AlertBanner";

type ModalLookupProductProps = {
  showModal: boolean;
  onSubmit: (product: Product) => void;
  onClose: () => void;
};

const ModalLookupProduct = ({
  showModal,
  onSubmit,
  onClose,
}: ModalLookupProductProps) => {
  console.log("ModalLookupProduct Re-Render");
  // 8999099923548
  const [barcode, setBarcode] = useState("");
  const { getProductByBarcode, error, clearError, isLoading } =
    usePrintFormModal();
  const handleConfirmButtonClick = async () => {
    const product = await getProductByBarcode(barcode);
    console.log({ product });
    if (!product) {
      console.log("Product not found");
      return;
    }
    onSubmit(product);
  };

  const handleCloseButtonClick = () => {
    // setBarcode("");
    onClose();
  };
  return (
    <>
      {isLoading && <FullPageLoading />}
      <Modal
        size="lg"
        showModal={showModal}
        onClose={() => onClose()}
        title="SCAN PRODUCT"
        footer={
          <div className="flex flex-row justify-end border-t border-solid border-slate-200 rounded-b p-2">
            <button
              data-testid="submitModalLookupProduct-button"
              className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={handleConfirmButtonClick}
            >
              Confirm
            </button>
            <button
              data-testid="closeModalLookupProduct-button"
              className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
              type="button"
              onClick={handleCloseButtonClick}
            >
              Close
            </button>
          </div>
        }
      >
        {error && <AlertBanner message={error} onClose={clearError} />}
        <div className="py-4 min-w-48 text-blueGray-500 text-lg leading-relaxed ">
          <InputGroup
            id="lookup-barcode"
            label="BARCODE"
            placeholder="Please Type Product Barcode"
            onChange={(e) => setBarcode(e.target.value)}
          />
        </div>
      </Modal>
    </>
  );
};

export default ModalLookupProduct;
