import React from "react";

type ModalProps = {
  showModal: boolean;
  onClose: () => void;
  title: string;
  titleStyle?: string;
  children: React.ReactNode;
  size: keyof typeof sizes;
  footer?: React.ReactNode;
};

const sizes = {
  lg: "max-w-lg",
  md: "max-w-md",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

const Modal: React.FC<ModalProps> = ({
  showModal,
  onClose,
  title,
  children,
  footer,
  size,
  titleStyle,
}) => {
  const sizeClass = sizes[size];
  return (
    <>
      {showModal ? (
        <>
          <div className="w-full justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-30 outline-none focus:outline-none">
            <div className={`relative w-full my-6 mx-auto ${sizeClass}`}>
              {/* content */}
              <div className="border-0 rounded-lg shadow-lg relative flex flex-col w-full bg-white outline-none focus:outline-none">
                {/* header */}
                <div className="flex items-start justify-between p-3 border-b border-solid border-slate-200 rounded-t">
                  <h3 className={`text-2xl font-semibold ${titleStyle}`}>
                    {title}
                  </h3>
                  <button
                    className="p-1 ml-auto bg-transparent border-0 text-black opacity-5 float-right text-3xl leading-none font-semibold outline-none focus:outline-none"
                    onClick={() => onClose()}
                  >
                    <span className="bg-transparent text-black opacity-5 h-6 w-6 text-2xl block outline-none focus:outline-none">
                      x
                    </span>
                  </button>
                </div>
                {/* body */}
                <div className="relative p-6 flex-auto">{children}</div>
                {/* footer */}
                {footer}
              </div>
            </div>
          </div>
          <div
            onClick={() => onClose()}
            className="opacity-25 fixed inset-0 z-20 bg-black"
          ></div>
        </>
      ) : null}
    </>
  );
};

export default Modal;
