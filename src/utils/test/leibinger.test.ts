import { parseCheckPrinterStatus, parseCheckMailingStatus } from "../leibinger";

describe("Leibinger Utils", () => {
  // Test case for parsing a valid printer status response
  it("parseCheckPrinterStatus should correctly parse a valid response", () => {
    // Given a sample printer status response
    const response = "^0=RS200\t6\t0\t0\t80\t0\r";

    // When parsing the response
    const result = parseCheckPrinterStatus(response);

    // Then it should return the correct parsed values
    expect(result).toEqual({
      response,
      nozzleState: 200, // The last digits of the first part of the response
      machineState: 6, // The second part of the response
      errorState: 0, // The third part of the response
      headCover: 0, // The fourth part of the response
      actSpeed: 80, // The fifth part of the response
    });
  });

  // Test case for parsing a valid mailing status response
  it("parseCheckMailingStatus should correctly parse a valid response", () => {
    // Given a sample mailing status response
    const response = "^0=SM256\t0\t3\t0\t1\t21\r";

    // When parsing the response
    const result = parseCheckMailingStatus(response);

    // Then it should return the correct parsed values
    expect(result).toEqual({
      response,
      fifoDepth: 256, // The last digits of the first part of the response
      fifoEntries: 0, // The second part of the response
      lastStartedPrintNo: 3, // The third part of the response
      stopAtNo: 0, // The fourth part of the response
      lastStartedPrintNoWasFinished: 1, // The fifth part of the response
    });
  });
});
