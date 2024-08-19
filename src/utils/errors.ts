export const QUEUE_ERROR_LIST = {
  UNDER_SPEED: "warning:Printer Running on Underspeed",
  UNDER_LIMIT: "warning:Under Limit",
  MAILING_BUFFER_EMPTY: "error:MAILING BUFFER EMPTY",
} as const;

export const CONNECTION_ERROR_LIST = {
  CLOSED: "error:PRINTER CONNECTION CLOSED",
  ERROR: "error:PRINTER CONNECTION ERROR",
  ENDED: "error:PRINTER CONNECTION ENDED",
} as const;

export const PRINTER_ERROR_LIST = {
  OPEN_NOZZLE_TIMEOUT: "error:OPENING NOZZLE TIMEOUT",
  HEADCOVER_OPEN: "error:Warning! Headcover Open",
} as const;

export const PRINTER_MESSAGE_LIST = {
  STOP_PRINT: "warning:STOP PRINTING",
  OPENINNG_NOZZLE: "warning:OPENING NOZZLE",
} as const;

export type QueueErrorList =
  (typeof QUEUE_ERROR_LIST)[keyof typeof QUEUE_ERROR_LIST];

export type ConnectionErrorList =
  (typeof CONNECTION_ERROR_LIST)[keyof typeof CONNECTION_ERROR_LIST];

export type PrinterErrorList =
  (typeof PRINTER_ERROR_LIST)[keyof typeof PRINTER_ERROR_LIST];

export type PrinterMessageList =
  (typeof PRINTER_MESSAGE_LIST)[keyof typeof PRINTER_MESSAGE_LIST];

export type ErrorList = QueueErrorList | ConnectionErrorList | PrinterErrorList;

export const isConnectionError = (
  value: string
): value is ConnectionErrorList => {
  return (Object.values(CONNECTION_ERROR_LIST) as string[]).includes(value);
};

export const isQueueError = (value: string): value is QueueErrorList => {
  return (Object.values(QUEUE_ERROR_LIST) as string[]).includes(value);
};
