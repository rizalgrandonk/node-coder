import Modal from "@/components/modal/Modal";
import { Dispatch, SetStateAction } from "react";

type ModalLookupProductProps = {
  showModal: boolean;
  setShowModal: Dispatch<SetStateAction<boolean>>;
  onSubmit: (data: any) => void;
};

const ModalLookupProduct = ({
  showModal,
  setShowModal,
}: ModalLookupProductProps) => {
  return (
    <Modal
      size="lg"
      showModal={showModal}
      setShowModal={setShowModal}
      title="SCAN PRODUCT"
      footer={
        <>
          <button
            className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            onClick={() => setShowModal(false)}
          >
            Close
          </button>
          <button
            className="bg-emerald-500 text-white active:bg-emerald-600 font-bold uppercase text-sm px-6 py-3 rounded shadow hover:shadow-lg outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
            type="button"
            onClick={() => setShowModal(false)}
          >
            Save Changes
          </button>
        </>
      }
    >
      <div className="my-4 min-w-48 text-blueGray-500 text-lg leading-relaxed">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            BARCODE
          </label>
          <div className="my-2 flex flex-row">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
          >
            Clear
          </button>
        </div>
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium leading-6 text-gray-900"
          >
            PRODUCT
          </label>
          <div className="my-2 flex flex-row">
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ModalLookupProduct;
