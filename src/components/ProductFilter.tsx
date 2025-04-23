
import { Button } from "@/components/ui/button";
import type { ProductCategory } from '@/pages/HomePage';

interface ProductFilterProps {
  selectedCategory: ProductCategory;
  onCategoryChange: (category: ProductCategory) => void;
}

const ProductFilter: React.FC<ProductFilterProps> = ({ selectedCategory, onCategoryChange }) => {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium mr-2">Filter:</span>
      <Button
        size="sm"
        variant={selectedCategory === "all" ? "default" : "outline"}
        onClick={() => onCategoryChange("all")}
      >
        All Products
      </Button>
      <Button
        size="sm"
        variant={selectedCategory === "nicotine" ? "default" : "outline"}
        onClick={() => onCategoryChange("nicotine")}
      >
        Nicotine
      </Button>
      <Button
        size="sm"
        variant={selectedCategory === "hemp" ? "default" : "outline"}
        onClick={() => onCategoryChange("hemp")}
      >
        Hemp THC
      </Button>
      <Button
        size="sm"
        variant={selectedCategory === "kratom" ? "default" : "outline"}
        onClick={() => onCategoryChange("kratom")}
      >
        Kratom
      </Button>
    </div>
  );
};

export default ProductFilter;
