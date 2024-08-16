type CounterCardProps = {
  color: keyof typeof colorSchema;
  value: string;
  caption: string;
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

const CounterCard: React.FC<CounterCardProps> = ({ color, value, caption }) => {
  const { borderColor, backgroundColor, textColor } = colorSchema[color];

  return (
    <div
      data-testid="card-wrapper"
      className={`flex justify-between items-center py-1 px-2.5 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 ${borderColor} ${backgroundColor}`}
    >
      <span data-testid="card-title" className={`font-light text-xs ${textColor}`}>
        {caption}
      </span>
      <div data-testid="card-value" className="font-bold text-lg">
        {value}
      </div>
    </div>
  );
};

export default CounterCard;
