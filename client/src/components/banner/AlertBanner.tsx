import { ExclamationCircleIcon, XMarkIcon } from "@heroicons/react/24/solid";
// exclamation-circle

const AlertBanner: React.FC<{ message: string; onClose: () => void }> = ({
  message,
  onClose,
}) => {
  return (
    <div
      data-testid="alert"
      className="mb-3 flex items-center bg-red-500 text-white text-sm font-bold px-4 py-3 rounded"
      role="alert"
    >
      <ExclamationCircleIcon className="size-5" />
      <p data-testid="alert-text" className="ml-2 flex-1">
        {message}
      </p>
      <button
        data-testid="alert-close-button"
        type="button"
        className="ml-6 text-white transition duration-150 ease-in-out hover:bg-red-400 focus:outline-none"
        onClick={onClose}
      >
        <XMarkIcon className="size-5" />
      </button>
    </div>
  );
};

export default AlertBanner;
