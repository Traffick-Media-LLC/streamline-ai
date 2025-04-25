
import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brand } from '@/types/statePermissions';

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterBrandId: string;
  onBrandFilterChange: (value: string) => void;
  brands: Brand[];
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  filterBrandId,
  onBrandFilterChange,
  brands
}) => {
  return (
    <div className="flex items-center gap-4 mb-4">
      <Input
        placeholder="Search products..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="flex-1"
      />
      <Select 
        value={filterBrandId} 
        onValueChange={onBrandFilterChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by brand" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Brands</SelectItem>
          {brands.map((brand) => (
            <SelectItem key={brand.id} value={brand.id.toString()}>
              {brand.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
