
export interface StateData {
  allowedProducts: {
    brandName: string;
    products: string[];
    logoUrl?: string;
  }[];
}

export interface StateInfo {
  name: string;
  data: StateData;
  id?: number;
}
