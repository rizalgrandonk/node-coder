export type Product = {
  id: number;
  name: string;
  received?: Date;
  description?: string;
  upc?: string;
  maxbuffer: number;
  localminlevel: number;
  localmaxlevel: number;
  codekey: string;
  endqueue?: number;
  availableqty: number;
  isactive: boolean;
  cardboardwidth?: number;
  cardboardlength?: number;
  widthallowance?: number;
  uniquecodes?: string[];
};
