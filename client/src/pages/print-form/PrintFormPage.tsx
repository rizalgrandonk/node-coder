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
import AlertBanner from "@/components/banner/AlertBanner";
import { Product } from "@/types/product";
import FullPageLoading from "@/components/FullPageLoading";
import * as UniquecodeServices from "@/services/uniquecodeService";
import { cn } from "@/utils/helper";

const connectedPrinter = [1000012];
// const connectedPrinter = [1000012, 1000013];
// const connectedPrinter = [1000012, 1000013, 10000014];
// const connectedPrinter = [1000012, 1000013, 10000014, 1000015];

const PrintDataSchema = z.object({
  batchs: z.array(
    z.object({
      // availableCount: z.number(),
      batchNo: z
        .string()
        .min(1, { message: "Batch Number is Required" })
        .max(255)
        .regex(/^[A-Z0-9\-\/]+$/, {
          message:
            "Only uppercase alphanumeric characters, dashes (-), and slashes (/) are allowed.",
        }),
      // printEstimate: z
      //   .number({
      //     message:
      //       "Estimate Quantity is Required and should be numeric value without symbol",
      //   })
      //   .int({
      //     message: "Estimate Quantity should be numeric value without symbol",
      //   })
      //   .gte(1)
      //   .refine(
      //     (val) => {
      //       console.log("val int");
      //       console.log("val", String);
      //       console.log(
      //         "val ken",
      //         val,
      //         val.toString().includes(".") && !val.toString().endsWith(".0")
      //       );
      //       return !val.toString().includes(".");
      //     },
      //     {
      //       message: "Estimate Quantity should be numeric value symbol (.)",
      //     }
      //   ),
      printEstimate: z
        .string()
        .regex(/^[0-9]+$/, {
          message: "Estimate Quantity should be numeric value without symbol",
        })
        .pipe(
          z.coerce
            .number()
            .int({
              message:
                "Estimate Quantity should be numeric value without symbol",
            })
            .gte(1)
        ),
      barcode: z.string().min(1),
      productName: z.string().min(1, { message: "Product is Required" }),
      productId: z.number().gte(1),
    })
  ),
});

type PrintDataType = z.infer<typeof PrintDataSchema>;

const PrintFormPage = () => {
  const navigate = useNavigate();
  const printDataCtx = usePrintData();
  const { showProductModal, setShowProductModal } = usePrintFormModal();

  const [alertMessage, setAlertMessage] = useState("");
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
        // availableCount: 0,
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

    // Send Create Batch Request To Server
    const createdBatchRequest = {
      batchs: formData.batchs.map((item, index) => ({
        batchNo: item.batchNo,
        barcode: item.barcode,
        printEstimate: item.printEstimate,
        productId: item.productId,
        productName: item.productName,
        markingPrinterId: connectedPrinter[index],
      })),
    };
    const createdBatchResponse = await startBatch(createdBatchRequest);
    if (createdBatchResponse.success) {
      const createdBatch = createdBatchResponse.data;
      console.log("Created Batch", createdBatchResponse);
      const batchs = formData.batchs.map((item, index) => {
        return {
          batchId: createdBatch.id,
          batchNo: item.batchNo,
          barcode: item.barcode,
          productId: item.productId,
          productName: item.productName,
          quantity: item.printEstimate,
          printerLineId: 1,
          markingPrinterId: connectedPrinter[index],
        };
      });

      // Update Print Data Context
      printDataCtx.updatePrintData(batchs);
      navigate("/dashboard");
    } else {
      setAlertMessage(createdBatchResponse.message ?? "Failed To Create Batch");
    }
    setIsLoading(false);
  };

  const setProductValueToForm = async (index: number, product: Product) => {
    if (product && product.upc) {
      clearErrors(`batchs.${index}.productName`);
      setValue(`batchs.${index}.productName`, product.name);

      setValue(`batchs.${index}.productId`, product.id);
      setValue(`batchs.${index}.barcode`, product.upc);
    }
  };
  const getAvailableQuantity = async () => {
    console.log("Get Available Quantity");
    setIsLoading(true);

    const response = await UniquecodeServices.getAvailableUniquecodes();

    setIsLoading(false);

    if (!response.success) {
      setAlertMessage(response.message ?? "Failed to get available quantity");
      return;
    }

    setAvailableQuantity(response.data.count);
  };

  return (
    <>
      {isLoading && <FullPageLoading />}
      <Header />

      <div className="min-h-screen p-3 bg-slate-200 text-gray-900">
        <form
          onSubmit={handleSubmit(formSubmitHandler)}
          className={cn(
            "bg-white flex flex-col gap-4 p-4 rounded-lg shadow-md",
            fields.length < 2 ? "max-w-5xl mx-auto" : ""
          )}
        >
          {alertMessage && (
            <AlertBanner
              message={alertMessage}
              onClose={() => setAlertMessage("")}
            />
          )}

          <div className="flex">
            <h1 className="text-3xl font-bold">Batch Form</h1>
          </div>

          <div className="flex flex-col max-w-sm pt-4">
            <InputGroup
              label="Available Quantity"
              id="availableUniquecodeCount"
              type="text"
              value={availableQuantity}
              readOnly
              buttonClick={() => getAvailableQuantity()}
              buttonIcon={<ArrowPathIcon className="size-6" />}
              className="focus:ring-blue-300"
              buttonClass="bg-emerald-600 hover:bg-emerald-500"
            />
          </div>

          <div
            className={cn(
              "grid gap-8",
              fields.length >= 2 ? "lg:grid-cols-2" : "grid-cols-1"
            )}
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
                  className="flex-grow space-y-5 px-10 py-4 m-auto"
                >
                  <InputGroup
                    register={register(`batchs.${index}.batchNo`)}
                    label="Batch Number"
                    id={`batchNo-${index}`}
                    type="text"
                    className="focus:ring-blue-300"
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
                    className="focus:ring-blue-300"
                    readOnly
                    errorMessage={errors?.batchs?.[index]?.productName?.message}
                    // buttonClick={() => getProduct(index)}
                    buttonClick={() => setShowProductModal(true)}
                    buttonText="SCAN"
                    buttonClass="bg-emerald-600 hover:bg-emerald-500"
                  />

                  <InputGroup
                    register={register(`batchs.${index}.printEstimate`)}
                    label="Estimate Quantity"
                    id={`printEstimate-${index}`}
                    type="text"
                    className="focus:ring-blue-300"
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
            className="w-full max-w-md self-center flex justify-center rounded-md bg-emerald-600 px-4 py-2.5 text-base font-semibold leading-6 text-white shadow-sm hover:bg-emerald-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 transition-all"
          >
            Start Batch
          </button>
        </form>
      </div>
      <ModalLookupProduct
        showModal={showProductModal}
        onClose={() => setShowProductModal(false)}
        onSubmit={(barcode) => {
          setShowProductModal(false);
          setProductValueToForm(0, barcode);
        }}
      />
    </>
  );
};
export default PrintFormPage;
