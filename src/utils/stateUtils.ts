
// Mock data - replace with actual state regulations
const stateData: Record<string, Record<string, { status: string; description: string }>> = {
  CA: {
    nicotine: { 
      status: 'Restricted', 
      description: 'Age restrictions and flavor bans apply' 
    },
    thc: { 
      status: 'Legal', 
      description: 'Hemp-derived products allowed with restrictions' 
    },
    kratom: { 
      status: 'Legal', 
      description: 'No specific state regulations' 
    }
  },
  // Add data for other states
};

export const getStateProductStatus = (stateCode: string) => {
  return stateData[stateCode] || {};
};

export const getStateColor = (stateCode: string, selectedProducts: string[]) => {
  const stateStatus = stateData[stateCode];
  if (!stateStatus) return 'fill-secondary/20';

  const hasRestrictions = selectedProducts.some(
    product => stateStatus[product]?.status === 'Restricted'
  );
  const isProhibited = selectedProducts.some(
    product => stateStatus[product]?.status === 'Prohibited'
  );

  if (isProhibited) return 'fill-destructive/50';
  if (hasRestrictions) return 'fill-warning/50';
  return 'fill-success/50';
};
