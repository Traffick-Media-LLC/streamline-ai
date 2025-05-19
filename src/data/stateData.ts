export interface StateData {
  allowedProducts: {
    brandName: string;
    products: string[];
    logoUrl?: string;
  }[];
}

export interface StateDataMap {
  [key: string]: StateData;
}

export interface ProductStatePermission {
  state: string;
  product: string;
  brandName: string;
  isAllowed: boolean;
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

// Helper functions for product state permissions
export const isProductLegalInState = async (stateName: string, productName: string): Promise<boolean | null> => {
  // This function would now be handled by our Edge Function directly
  // But we keep it for backwards compatibility
  return null; // null means "unknown"
};
