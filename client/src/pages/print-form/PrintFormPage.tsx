// import { useState } from "react";
import { useNavigate } from "react-router-dom";
// import ModalLookupPersonel from "./components/ModalLookupPersonel";
// import ModalLookupProduct from "./components/ModalLookupProduct";

const PrintFormPage = () => {
  const navigate = useNavigate();
  // const [showModal, setShowModal] = useState(false);

  // const lookupPersonelHandler = () => {
  //   setShowModal(true);
  // };

  const formSubmitHandler = () => {
    localStorage.setItem("hasFilledForm", "true");
    navigate("/dashboard");
  };

  return (
    <>
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="w-full max-w-md p-8 bg-white border-2 border-indigo-50 rounded-lg shadow-lg">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-indigo-600">
              Print Setup
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Personel
              </label>
              <div className="mt-2 flex flex-row">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                {/* Button Lookup */}
                <button
                  type="button"
                  className="ml-2 rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                  // onClick={lookupPersonelHandler}
                >
                  Cari
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Produk
              </label>
              <div className="mt-2 flex flex-row">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                />
                {/* Button Lookup */}
                <button
                  type="button"
                  className="ml-2 rounded-md border border-gray-300 bg-white py-1.5 px-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cari
                </button>
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium leading-6 text-gray-900"
              >
                Nomor Batch Cetak
              </label>
              <div className="mt-2 flex flex-row">
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

            <div>
              <div className="flex flex-row gap-2">
                <div className="flex-1">
                  <label
                    htmlFor="estimasi-jumlah-cetak"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Estimasi Jumlah Cetak
                  </label>
                  <div className="mt-2 flex flex-row gap-2">
                    <input
                      id="estimasi-jumlah-cetak"
                      name="estimasi-jumlah-cetak"
                      type="text"
                      required
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label
                    htmlFor="jumlah-tersedia"
                    className="block text-sm font-medium leading-6 text-gray-900"
                  >
                    Jumlah Tersedia
                  </label>
                  <div className="mt-2 flex flex-row gap-2">
                    <input
                      id="jumlah-tersedia"
                      name="jumlah-tersedia"
                      type="text"
                      required
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                onClick={() => formSubmitHandler()}
              >
                Konfirmasi Print
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default PrintFormPage;
