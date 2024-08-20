export type Batch = {
  id: number;
  created: Date;
  sent?: Date;
  sendconfirmed?: Date;
  description?: string;
  blockcodecount: number;
  qty: number;
  endqueue: number;
  printedqty: number;
  batchno?: string;
  printerlineid: number;
  createdby: number; // Assuming this is an integer, based on the precision (10, 0)
  updated: Date;
  updatedby: number; // Assuming this is an integer, based on the precision (10, 0)
  productid: number;
  isactive?: boolean;
  nik?: string;
  triggercount?: string;
  goodreadcount?: string;
  noreadcount?: string;
  matchcount?: string;
  mismatchcount?: string;
};
