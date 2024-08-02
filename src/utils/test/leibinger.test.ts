import { parseCheckPrinterStatus, parseCheckMailingStatus } from "../leibinger";

describe("Leibinger Utils", () => {
  it("parseCheckPrinterStatus should correctly parse a valid response", () => {
    const response = "^0=RS200\t6\t0\t0\t80\t0\r";
    const result = parseCheckPrinterStatus(response);

    expect(result).toEqual({
      response,
      nozzleState: 200, // The last digit of the first part
      machineState: 6, // The second part
      errorState: 0, // The third part
      headCover: 0, // The fourth part
      actSpeed: 80, // The fifth part
    });
  });

  it("parseCheckMailingStatus should correctly parse a valid response", () => {
    const response = "^0=SM256\t0\t3\t0\t1\t21\r";
    const result = parseCheckMailingStatus(response);

    expect(result).toEqual({
      response,
      fifoDepth: 256, // The last digit of the first part
      fifoEntries: 0, // The second part
      lastStartedPrintNo: 3, // The third part
      stopAtNo: 0, // The fourth part
      lastStartedPrintNoWasFinished: 1, // The fifth part
    });
  });
});
