export const QUEUE_ERROR_LIST = {
  UNDER_SPEED: "Printer Running on Underspeed",
  UNDER_LIMIT: "Under Limit",
  MAILING_BUFFER_EMPTY: "MAILING BUFFER EMPTY",
} as const;

export const CONNECTION_ERROR_LIST = {
  CLOSED: "PRINTER CONNECTION CLOSED",
  ERROR: "PRINTER CONNECTION ERROR",
  ENDED: "PRINTER CONNECTION ENDED",
} as const;

export const PRINTER_ERROR_LIST = {
  OPEN_NOZZLE_TIMEOUT: "OPENING NOZZLE TIMEOUT",
  HEADCOVER_OPEN: "Warning! Headcover Open",
} as const;

export const PRINTER_MESSAGE_LIST = {
  STOP_PRINT: "STOP PRINTING",
  OPENINNG_NOZZLE: "OPENING NOZZLE",
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
