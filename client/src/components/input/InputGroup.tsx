import { UseFormRegisterReturn } from "react-hook-form";

type InputGroupProps = {
  id: string;
  label: string;
  register?: UseFormRegisterReturn;
  errorMessage?: string;
  buttonClick?: () => void;
  buttonText?: string;
  buttonIcon?: JSX.Element;
} & React.InputHTMLAttributes<HTMLInputElement>;

const InputGroup = ({
  id,
  label,
  register,
  errorMessage,
  buttonClick,
  buttonIcon,
  buttonText,
  ...props
}: InputGroupProps) => {
  const isInputError = !!errorMessage;
  return (
    <div className="relative">
      <div className="flex flex-row">
        <label
          htmlFor={id}
          className={`absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-900 ${
            isInputError ? "text-red-500" : ""
          }`}
        >
          {label}
        </label>
        <input
          data-testid={`${id}-input`}
          id={id}
          {...register}
          className={`block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 ${
            props.className
          } ${isInputError ? "ring-2 ring-red-300" : ""}`}
          placeholder={label}
          {...props}
        />
        {buttonClick && (
          <button
            data-testid={`${id}-button`}
            type="button"
            className="flex flex-row ml-2 rounded-md bg-indigo-600 text-white py-1.5 px-2 text-sm font-semibold hover:bg-indigo-800"
            onClick={buttonClick}
          >
            {buttonIcon && buttonIcon}
            {buttonText && <span className="m-auto">{buttonText}</span>}
          </button>
        )}
      </div>
      {errorMessage && (
        <span className="text-xs text-red-500">{errorMessage}</span>
      )}
    </div>
  );
};

export default InputGroup;
