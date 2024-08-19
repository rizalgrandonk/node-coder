import Modal from "@/components/modal/Modal";
type ErrorModalProps = {
  message?: string;
  title: string;
  onClose: () => void;
};

/**
 * A modal component to display error messages.
 *
 * @param {ErrorModalProps} props - The properties for the error modal.
 * @param {string} props.message - The error message to display.
 * @param {string} props.title - The title of the error modal.
 * @param {function} props.onClose - The function to call when the modal is closed.
 * @return {JSX.Element|null} The error modal component or null if no message is provided.
 */
const ErrorModal = ({ message, title, onClose }: ErrorModalProps) => {
  if (!message) return null;
  return (
    <Modal showModal={true} onClose={onClose} footer={<Footer onClose={onClose} />} size="2xl" title={title} titleStyle="text-red-500">
      {message}
    </Modal>
  );
};

/**
 * A React functional component that renders a footer with a close button.
 *
 * @param {function} onClose - A callback function to be executed when the close button is clicked.
 * @return {JSX.Element} A JSX element representing the footer with a close button.
 */
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
