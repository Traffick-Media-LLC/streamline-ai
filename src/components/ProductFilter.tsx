
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ProductFilterProps {
  selectedProducts: string[];
  setSelectedProducts: (products: string[]) => void;
}

const ProductFilter = ({ selectedProducts, setSelectedProducts }: ProductFilterProps) => {
  const products = [
    { id: 'nicotine', label: 'Nicotine Products' },
    { id: 'thc', label: 'Hemp-derived THC' },
    { id: 'kratom', label: 'Kratom Products' },
  ];

  const handleProductToggle = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(p => p !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Filter Products</h2>
      <div className="space-y-2">
        {products.map(product => (
          <div key={product.id} className="flex items-center space-x-2">
            <Checkbox
              id={product.id}
              checked={selectedProducts.includes(product.id)}
              onCheckedChange={() => handleProductToggle(product.id)}
            />
            <Label htmlFor={product.id}>{product.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductFilter;
