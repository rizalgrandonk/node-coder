type PrinterMessageProps = {
  message: string;
};
export const PrinterMessage: React.FC<PrinterMessageProps> = ({ message }) => {
  const splitMessage = message.split(":");
  const type = splitMessage[0];
  const msg = splitMessage[1];
  return (
    <div
      className={`text-center ${
        type === "success" ? "bg-emerald-500" : type === "warning" ? "bg-amber-500" : "bg-red-500"
      } text-white text-lg font-bold p-3 rounded-lg mb-6 sm:text-xl sm:p-4 shadow-sm hover:shadow-md transition-shadow duration-300`}
    >
      {msg}
    </div>
  );
};
