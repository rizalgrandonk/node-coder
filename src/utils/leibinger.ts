// Helper method to parse the check printer status response
export const parseCheckPrinterStatus = (response: string) => {
  // Parse the response
  const parts = response.split(/\s+/);

  const errorState = parseInt(parts[2], 10);
  const errorPair = 33554431;
  const errorCode = errorState & errorPair;

  return {
    response,
    nozzleState: parseInt(parts[0].split("=RS")[1], 10),
    machineState: parseInt(parts[1], 10),
    errorState: errorCode,
    headCover: parseInt(parts[3], 10),
    actSpeed: parseInt(parts[4], 10),
  };
};

// Helper method to parse the check mailing status response
export const parseCheckMailingStatus = (response: string) => {
  // Description of responses
  // FifoDepth                      = Available batch depth of the Mailing Fifos. (Normally 256 records)
  // FifoEntrys                     = Number of mail records which are available in the mailing Fifo
  // LastStartedPrintNo             = No.of the mail record which’s print has already started (0 =if no one is available)
  // StopAtNo                       = Record number where a print stop is generated (=Value which has been set before with ^0=CM )
  // LastStartedPrintNoWasFinished  = Flag (If = 0, the last print was started, but not finished, if >0, the last print was finished, but the next one for sure not started)

  // Parse the response
  const parts = response.split(/\s+/);
  return {
    response,
    fifoDepth: parseInt(parts[0].split("=SM")[1], 10),
    fifoEntries: parseInt(parts[1], 10),
    lastStartedPrintNo: parseInt(parts[2], 10),
    stopAtNo: parseInt(parts[3], 10),
    lastStartedPrintNoWasFinished: parseInt(parts[4], 10),
  };
};

// Helper method to parse the current counter
export const parseCurrentCouter = (response: string) => {
  // Par1: Product Counter
  // Par2: Stop after X Products
  // Par3: Total print counter

  // Parse the response
  const parts = response.split(/\s+/);
  return {
    response,
    productCounter: parseInt(parts[0].split("=CC")[1], 10),
    stopoAfter: parseInt(parts[1], 10),
    totalPrintCounter: parseInt(parts[2], 10),
  };
};
