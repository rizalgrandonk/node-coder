type CounterCardProps = {
  color: "default" | "secondary" | "danger" | "warning" | "success";
  caption: string;
  val: string;
};

const defaultColorSchema = {
  borderColor: "",
  backgroundColor: "",
  textColor: "",
};

const secondaryColorSchema = {
  borderColor: "border-gray-400",
  backgroundColor: "bg-gray-100",
  textColor: "text-gray-800",
};

const dangerColorSchema = {
  borderColor: "border-red-400",
  backgroundColor: "bg-red-100",
  textColor: "text-red-800",
};

const warningColorSchema = {
  borderColor: "border-yellow-400",
  backgroundColor: "bg-yellow-100",
  textColor: "text-yellow-800",
};

const successColorSchema = {
  borderColor: "border-green-400",
  backgroundColor: "bg-green-100",
  textColor: "text-green-800",
};

const colorSchema = {
  default: defaultColorSchema,
  secondary: secondaryColorSchema,
  danger: dangerColorSchema,
  warning: warningColorSchema,
  success: successColorSchema,
};

export const CounterCard: React.FC<CounterCardProps> = ({ color, val, caption }) => {
  console.log({ color, val, caption });
  return (
    <div
      className={`col-span-1 p-3 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 ${colorSchema[color].borderColor} ${colorSchema[color].backgroundColor}`}
    >
      <span className={`flex justify-start font-light text-xs ${colorSchema[color].textColor}`}>{caption}</span>
      <div className={`flex justify-end font-bold text-lg`}>{val}</div>
    </div>
  );
};
