type PrinterMessageProps = {
  message: string;
};
/**
 * A React functional component that displays a printer message with a specific type (success, warning, or error) and a corresponding message.
 *
 * @param {string} message - A string containing the type and message separated by a colon (:)
 * @return {JSX.Element} A JSX element representing the printer message
 */
const PrinterMessage: React.FC<PrinterMessageProps> = ({ message }) => {
  const splitMessage = message.split(":");
  const type = splitMessage[0];
  const msg = splitMessage[1];
  return (
    <div
      className={`text-center ${
        type === "success" ? "bg-emerald-500" : type === "warning" ? "bg-yellow-300 text-gray-800" : "bg-red-500 text-white"
      } text-lg font-bold p-3 rounded-lg mb-2 sm:text-xl sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-300`}
    >
      {msg}
    </div>
  );
};

export default PrinterMessage;
