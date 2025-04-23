
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStateProductStatus } from '../utils/stateUtils';

interface StateDetailsProps {
  state: string;
  selectedProducts: string[];
}

const StateDetails = ({ state, selectedProducts }: StateDetailsProps) => {
  const statuses = getStateProductStatus(state);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{state} Regulations</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedProducts.map(product => (
          <div key={product} className="space-y-2">
            <h3 className="font-semibold capitalize">{product}</h3>
            <p>{statuses[product]?.status || 'Status unknown'}</p>
            <p className="text-sm text-muted-foreground">
              {statuses[product]?.description || 'No regulation details available'}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default StateDetails;
