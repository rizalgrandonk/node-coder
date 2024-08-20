// import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePrintData } from "@/context/print";
import { SubmitHandler, useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ModalLookupProduct from "./components/ModalLookupProduct";
import { usePrintFormModal } from "./hooks/usePrintFormModal";
import InputGroup from "@/components/input/InputGroup";
import Header from "@/components/header/Header";
import { PrinterIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { startBatch } from "@/services/batchService";
import { sleep } from "@/utils/helper";

const connectedPrinter = [1000012];
// const connectedPrinter = [1000012, 1000013];
// const connectedPrinter = [1000012, 1000013, 10000014];
// const connectedPrinter = [1000012, 1000013, 10000014, 1000015];

const PrintDataSchema = z.object({
  batchs: z.array(
    z.object({
      availableCount: z.number(),
      batchNo: z
        .string()
        .min(1)
        .max(255)
        .regex(/^[A-Z0-9\-\/]+$/, {
          message:
            "Only uppercase alphanumeric characters, dashes, and slashes are allowed.",
        }),
      printEstimate: z.number().gte(1),
      barcode: z.string().min(1),
      productName: z.string().min(1),
      productId: z.number().gte(1),
    })
  ),
});

type PrintDataType = z.infer<typeof PrintDataSchema>;

const PrintFormPage = () => {
  const navigate = useNavigate();
  const printDataCtx = usePrintData();
  const { showProductModal, setShowProductModal, getProductByBarcode } =
    usePrintFormModal();

  const [availableQuantity, setAvailableQuantity] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    setValue,
    clearErrors,
  } = useForm<PrintDataType>({
    resolver: zodResolver(PrintDataSchema),
    mode: "all",
    defaultValues: {
      batchs: connectedPrinter.map(() => ({
        batchNo: "",
        productName: "",
        availableCount: 0,
        // productId: 0,
        // printEstimate: 0,
        // barcode: "",
      })),
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "batchs",
  });

  console.log("errors", errors.batchs);
  const formSubmitHandler: SubmitHandler<PrintDataType> = async (formData) => {
    setIsLoading(true);
    console.log("Form Submit Handler", formData);

    const batchs = formData.batchs.map((item, index) => ({
      batchNo: item.batchNo,
      barcode: item.barcode,
      productId: item.productId,
      productName: item.productName,
      quantity: item.printEstimate,
      printerLineId: 1,
      markingPrinterId: connectedPrinter[index],
    }));

    // Update Print Data Context
    printDataCtx.updatePrintData(batchs);

    // Send Create Batch Request To Server
    const createdBatchRequest = {
      batchs: formData.batchs.map((item) => ({
        batchNo: item.batchNo,
        barcode: item.barcode,
        printEstimate: item.printEstimate,
        productId: item.productId,
      })),
    };
    const createdBatch = await startBatch(createdBatchRequest);
    if (createdBatch.success) {
      navigate("/dashboard");
    } else {
    }
    setIsLoading(false);
  };

  const getProduct = async (index: number) => {
    setIsLoading(true);

    // ! FOR TESTING
    await sleep(1000);

    const product = await getProductByBarcode("BARCODE-001");
    if (product && product.upc) {
      clearErrors(`batchs.${index}.productName`);
      setValue(`batchs.${index}.productName`, product.name);

      setValue(`batchs.${index}.productId`, product.id);
      setValue(`batchs.${index}.barcode`, product.upc);
      // setValue("productName", product.name);
    }
    setIsLoading(false);
  };
  const getAvailableQuantity = async () => {
    setIsLoading(true);

    // ! FOR TESTING
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const availableQuantity = await Promise.resolve(1000);
    setAvailableQuantity(availableQuantity);
    // clearErrors(`batchs.${index}.availableCount`);
    // setValue(`batchs.${index}.availableCount`, availableQuantity);
    // setValue("availableCount", availableQuantity);
    setIsLoading(false);
  };

  return (
    <>
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="flex items-center gap-3 bg-white p-3 rounded">
            <ArrowPathIcon className="size-6 animate-spin" />
            Loading...
          </div>
        </div>
      )}
      <Header />
      <div className="min-h-screen p-3 bg-slate-200 text-gray-900">
        <form
          onSubmit={handleSubmit(formSubmitHandler)}
          className="bg-white space-y-4 flex flex-col gap-4 p-4 rounded-lg shadow-md "
        >
          <div className="flex">
            <h1 className="text-3xl font-bold">Batch Form</h1>
          </div>

          <div className="flex flex-col max-w-sm">
            <InputGroup
              label="Available Quantity"
              id="availableUniquecodeCount"
              type="text"
              value={availableQuantity}
              readOnly
              buttonClick={() => getAvailableQuantity()}
              buttonIcon={<ArrowPathIcon className="size-6" />}
            />
          </div>
          <div
            className={`grid grid-cols-1 ${
              fields.length >= 2 ? "lg:grid-cols-2" : ""
            } gap-8`}
          >
            {fields.map((item, index) => (
              <div
                key={item.id}
                className="w-full bg-white flex border-2 border-gray-100 rounded-lg py-2 divide-x shadow"
              >
                <div className="flex flex-col items-center gap-3 px-3 py-1">
                  <PrinterIcon className="size-6" />
                  <span
                    style={{
                      writingMode: "vertical-rl",
                      textOrientation: "upright",
                    }}
                    className="tracking-tighter leading-none"
                  >
                    1-{connectedPrinter[index]}
                  </span>
                </div>

                <div
                  key={item.id}
                  className="flex-grow space-y-6 px-12 py-4 gap-4 m-auto"
                >
                  <InputGroup
                    register={register(`batchs.${index}.batchNo`)}
                    label="Batch Number"
                    id={`batchNo-${index}`}
                    type="text"
                    errorMessage={errors?.batchs?.[index]?.batchNo?.message}
                    onChange={(e) =>
                      setValue(
                        `batchs.${index}.batchNo`,
                        e.target.value.toUpperCase()
                      )
                    }
                  />

                  <InputGroup
                    register={register(`batchs.${index}.productName`)}
                    label="Product"
                    id={`productName-${index}`}
                    type="text"
                    readOnly
                    errorMessage={errors?.batchs?.[index]?.productName?.message}
                    buttonClick={() => getProduct(index)}
                    buttonText="SCAN"
                  />

                  {/* <InputGroup
                    register={register(`batchs.${index}.availableCount`, {
                      valueAsNumber: true,
                    })}
                    label="Available Quantity"
                    id="availableCount"
                    type="text"
                    readOnly
                    errorMessage={
                      errors?.batchs?.[index]?.availableCount?.message
                    }
                    buttonClick={() => getAvailableQuantity(index)}
                  /> */}

                  <InputGroup
                    register={register(`batchs.${index}.printEstimate`, {
                      valueAsNumber: true,
                    })}
                    label="Estimate Quantity"
                    id={`printEstimate-${index}`}
                    type="text"
                    errorMessage={
                      errors?.batchs?.[index]?.printEstimate?.message
                    }
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            data-testid="startBatch-button"
            type="submit"
            className="w-full max-w-md self-center flex justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
          >
            Start Batch
          </button>
        </form>
      </div>
      <ModalLookupProduct
        showModal={showProductModal}
        setShowModal={setShowProductModal}
        onSubmit={() => setShowProductModal(false)}
      />
    </>
  );
};
export default PrintFormPage;
