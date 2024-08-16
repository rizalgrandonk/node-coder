import Modal from "@/components/modal/Modal";
type ErrorModalProps = {
  message?: string;
  title: string;
  onClose: () => void;
};

const ErrorModal = ({ message, title, onClose }: ErrorModalProps) => {
  if (!message) return null;
  return (
    <Modal showModal={true} onClose={onClose} footer={<Footer onClose={onClose} />} size="2xl" title={title} titleStyle="text-red-500">
      {message}
    </Modal>
  );
};

const Footer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  return (
    <div className="flex items-center justify-end p-3 border-t border-solid border-slate-200 rounded-b">
      <button
        className="text-red-500 background-transparent font-bold uppercase px-6 py-2 text-sm outline-none focus:outline-none mr-1 mb-1 ease-linear transition-all duration-150"
        type="button"
        onClick={onClose}
      >
        Close
      </button>
    </div>
  );
};

export default ErrorModal;
