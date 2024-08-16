// import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrintData } from "@/context/print";
import { SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ModalLookupPersonel from "./components/ModalLookupPersonel";
import ModalLookupProduct from "./components/ModalLookupProduct";
import { usePrintFormModal } from "./hooks/usePrintFormModal";

const PrintDataSchema = z.object({
  availableCount: z.number().gte(1),
  batchNo: z.string().min(1),
  personel: z.string().min(1),
  printEstimate: z.number().gte(1),
  barcode: z.string().min(1).default("default barcode"),
  productName: z.string().min(1),
});
type PrintDataType = z.infer<typeof PrintDataSchema>;

const PrintFormPage = () => {
  const navigate = useNavigate();
  const printDataCtx = usePrintData();
  const { showPersonelModal, setShowPersonelModal, lookupPersonelSubmitHandler, showProductModal, setShowProductModal, lookupProductSubmitHandler } =
    usePrintFormModal();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PrintDataType>({
    resolver: zodResolver(PrintDataSchema),
    mode: "all",
    defaultValues: {
      availableCount: 100000,
    },
  });

  const formSubmitHandler: SubmitHandler<PrintDataType> = (_) => {
    console.log("Form Submit Handler", _);
    // TODO: Get data from form
    printDataCtx.updatePrintData({
      availableCount: 0,
      batchNo: "BATCH-001",
      personel: "Personel-001",
      printEstimate: 1000000,
      barcode: "BARCODE-001",
      scannedBarcode: "BARCODE-001",
      productName: "Product-001",
    });
    navigate("/dashboard");
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md p-8 bg-white border-2 border-indigo-50 rounded-lg shadow-lg">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-indigo-600">Print Setup</h2>
          </div>

          <form onSubmit={handleSubmit(formSubmitHandler)} className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-6">
            <div>
              <label htmlFor="personel" className="block text-sm font-medium leading-6 text-gray-900">
                Personel
              </label>
              <div className="mt-2 flex flex-row">
                <input
                  {...register("personel")}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                {/* Button Lookup */}
                <button
                  type="button"
                  className="ml-2 rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  onClick={() => setShowPersonelModal(true)}
                >
                  SCAN
                </button>
              </div>
              {errors.personel && <span className="text-xs text-red-500">{errors.personel.message}</span>}
            </div>

            <div>
              <label htmlFor="productName" className="block text-sm font-medium leading-6 text-gray-900">
                Product
              </label>
              <div className="mt-2 flex flex-row">
                <input
                  {...register("productName")}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                {/* Button Lookup */}
                <button
                  type="button"
                  className="ml-2 rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  onClick={() => setShowProductModal(true)}
                >
                  SCAN
                </button>
              </div>
              {errors.productName && <span className="text-xs text-red-500">{errors.productName.message}</span>}
            </div>

            <div>
              <label htmlFor="batchNo" className="block text-sm font-medium leading-6 text-gray-900">
                Batch Number
              </label>
              <div className="mt-2 flex flex-row">
                <input
                  {...register("batchNo")}
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
              </div>
              {errors.batchNo && <span className="text-xs text-red-500">{errors.batchNo.message}</span>}
            </div>

            <div>
              <div className="flex flex-row gap-2">
                <div className="flex-1">
                  <label htmlFor="printEstimate" className="block text-sm font-medium leading-6 text-gray-900">
                    Quantity
                  </label>
                  <div className="mt-2 flex flex-row gap-2">
                    <input
                      {...register("printEstimate", { valueAsNumber: true })}
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  {errors.printEstimate && <span className="text-xs text-red-500">{errors.printEstimate.message}</span>}
                </div>
                <div className="flex-1">
                  <label htmlFor="availableCount" className="block text-sm font-medium leading-6 text-gray-900">
                    Available Quantity
                  </label>
                  <div className="mt-2 flex flex-row gap-2">
                    <input
                      {...register("availableCount", { valueAsNumber: true })}
                      disabled
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                  {errors.availableCount && <span className="text-xs text-red-500">{errors.availableCount.message}</span>}
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Start Printing
              </button>
            </div>
          </form>
        </div>
      </div>

      <ModalLookupPersonel showModal={showPersonelModal} setShowModal={setShowPersonelModal} onSubmit={lookupPersonelSubmitHandler} />
      <ModalLookupProduct showModal={showProductModal} setShowModal={setShowProductModal} onSubmit={lookupProductSubmitHandler} />
    </>
  );
};

export default PrintFormPage;
