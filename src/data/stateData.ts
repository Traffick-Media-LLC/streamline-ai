
export interface StateData {
  allowedProducts: {
    brandName: string;
    products: string[];
  }[];
}

export interface StateDataMap {
  [key: string]: StateData;
}

// This is now just for backwards compatibility until we fetch from the database
export const stateData: StateDataMap = {
  Kentucky: {
    allowedProducts: []
  },
  California: {
    allowedProducts: []
  },
  Alabama: {
    allowedProducts: []
  }
};

