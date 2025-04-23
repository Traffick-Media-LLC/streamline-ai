
export interface StateData {
  status: 'green' | 'yellow' | 'red' | 'gray';
  allowedProducts: Record<string, string[]>;
}

export interface StateDataMap {
  [key: string]: StateData;
}

export const statusColors = {
  green: "#38a169",
  yellow: "#ecc94b",
  red: "#e53e3e",
  gray: "#a0aec0"
};
