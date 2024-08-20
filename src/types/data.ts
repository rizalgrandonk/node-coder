export type AdUser = {
  ad_user_id: number;
  ad_client_id: number;
  ad_org_id: number;
  codekey: string;
  name: string;
  description?: string | null;
  password: string;
  isactive: string;
};

export type Batch = {
  id: number;
  created: Date;
  sent?: Date | null;
  sendconfirmed?: Date | null;
  description?: string | null;
  blockcodecount: number;
  qty: number;
  endqueue: number;
  printedqty: number;
  batchno?: string | null;
  printerlineid: number;
  createdby: number;
  updated: Date;
  updatedby: number;
  productid: number;
  isactive?: boolean | null;
  nik?: string | null;
  triggercount?: string | null;
  goodreadcount?: string | null;
  noreadcount?: string | null;
  matchcount?: string | null;
  mismatchcount?: string | null;
};

export type CoderErrorLog = {
  id: number;
  created?: Date | null;
  errormessage: string;
  errortimestamp?: Date | null;
  batchno?: string | null;
  sendconfirmed?: Date | null;
  batchid?: number | null;
  markingprinterid?: number | null;
};

export type CoderPersonel = {
  coderpersonel_id: number;
  name: string;
  nik: string;
  isactive: boolean;
};

export type ErrorCode = {
  errorcode?: string | null;
  errorname?: string | null;
  errordescription?: string | null;
};

export type Product = {
  name: string;
  received?: Date | null;
  description?: string | null;
  upc?: string | null;
  maxbuffer: number;
  localminlevel: number;
  localmaxlevel: number;
  codekey: string;
  endqueue?: number | null;
  availableqty: number;
  isactive: boolean;
  id: number;
  cardboardwidth?: number | null;
  cardboardlength?: number | null;
  widthallowance?: number | null;
  uniquecodes: UniqueCode[];
};

export type UniqueCode = {
  productid?: number | null;
  uniquecode: string;
  printed?: Date | null;
  received: Date;
  batchid?: number | null;
  sent?: Date | null;
  sendconfirmed?: Date | null;
  buffered?: Date | null;
  printerlineid?: number | null;
  markingprinterid?: number | null;
  id: number;
  isactive: boolean;
  coderstatus?: string | null;
  product?: Product | null;
};
