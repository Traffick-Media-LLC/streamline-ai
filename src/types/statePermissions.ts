
export interface State {
  id: number;
  name: string;
}

export interface StateProduct {
  id: number;
  state_id: number;
  product_id: number | null;
}

export interface Product {
  id: number;
  name: string;
  brand_id?: number;
  brand?: Brand;
}

export interface Brand {
  id: number;
  name: string;
  logo_url: string | null;
}

export interface StatePermissionsProps {
  onStateClick?: (stateName: string) => void;
}

export interface SavePermissionResult {
  success: boolean;
  error?: string;
}
