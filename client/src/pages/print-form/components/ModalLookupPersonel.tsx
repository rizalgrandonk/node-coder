import Modal from "@/components/modal/Modal";
import { useState } from "react";
const ModalLookupPersonel = () => {
  const [showModal, setShowModal] = useState(false);
  return (
    <Modal
      showModal={showModal}
      setShowModal={setShowModal}
      title="Modal Title"
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
      <p className="my-4 text-blueGray-500 text-lg leading-relaxed">
        I always felt like I could do anything. That’s the main thing people are controlled by! Thoughts- their perception of themselves! They're slowed down by
        their perception of themselves. If you're taught you can’t do anything, you won’t do anything. I was taught I could do everything.
      </p>
    </Modal>
  );
};
export default ModalLookupPersonel;
