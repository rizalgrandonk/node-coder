import { cn } from "@/utils/helper";
import { UseFormRegisterReturn } from "react-hook-form";
import { forwardRef } from "react";

type InputGroupProps = {
  id: string;
  label: string;
  register?: UseFormRegisterReturn;
  errorMessage?: string;
  buttonClick?: () => void;
  buttonText?: string;
  buttonIcon?: JSX.Element;
  buttonClass?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

const InputGroup = forwardRef<HTMLInputElement, InputGroupProps>(
  (
    {
      id,
      label,
      register,
      errorMessage,
      buttonClick,
      buttonIcon,
      buttonText,
      className,
      buttonClass,
      ...props
    },
    ref
  ) => {
    const isInputError = !!errorMessage;
    return (
      <div className="relative flex flex-col gap-1">
        <div className="flex flex-row">
          <label
            htmlFor={id}
            className={cn(
              "absolute -top-2 left-2 inline-block bg-white px-1 text-xs font-medium text-gray-700",
              isInputError ? "text-red-500" : ""
            )}
          >
            {label}
          </label>
          <input
            ref={ref}
            data-testid={`${id}-input`}
            id={id}
            {...register}
            className={cn(
              "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-gray-600 sm:text-sm sm:leading-6",
              className,
              isInputError ? "ring-2 ring-red-300 focus:ring-red-500" : ""
            )}
            placeholder={label}
            {...props}
          />
          {buttonClick && (
            <button
              data-testid={`${id}-button`}
              type="button"
              className={cn(
                "flex flex-row ml-2 rounded-md bg-gray-600 text-white py-1.5 px-2 text-sm font-semibold hover:bg-gray-800",
                buttonClass
              )}
              onClick={buttonClick}
            >
              {buttonIcon && buttonIcon}
              {buttonText && <span className="m-auto">{buttonText}</span>}
            </button>
          )}
        </div>
        {errorMessage ? (
          <span
            data-testid={`${id}-inputErrorMessage`}
            className="text-xs text-red-500 px-1"
          >
            {errorMessage}
          </span>
        ) : (
          <div className="h-4" />
        )}
      </div>
    );
  }
);

export default InputGroup;
