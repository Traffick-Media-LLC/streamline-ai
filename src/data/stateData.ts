
export interface StateData {
  status: 'green' | 'yellow' | 'red' | 'gray';
  allowedProducts: string[];
}

export interface StateDataMap {
  [key: string]: StateData;
}

export const stateData: StateDataMap = {
  Kentucky: {
    status: "yellow",
    allowedProducts: ["Nicotine Pouches", "CBD Gummies"]
  },
  California: {
    status: "green",
    allowedProducts: ["THC Vapes", "CBD Gummies", "Nicotine Pouches"]
  },
  Alabama: {
    status: "red",
    allowedProducts: []
  }
};

export const statusColors = {
  green: "#38a169",
  yellow: "#ecc94b",
  red: "#e53e3e",
  gray: "#a0aec0"
};
