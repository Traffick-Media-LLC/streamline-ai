
import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brand } from '@/types/statePermissions';
import { Badge } from "@/components/ui/badge";
import { Check, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FilterControlsProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  filterBrandId: string;
  onBrandFilterChange: (value: string) => void;
  brands: Brand[];
  sortBy: string;
  onSortChange: (value: string) => void;
  selectedCount: number;
  totalCount: number;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  searchQuery,
  onSearchChange,
  filterBrandId,
  onBrandFilterChange,
  brands,
  sortBy,
  onSortChange,
  selectedCount,
  totalCount
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select 
            value={filterBrandId} 
            onValueChange={onBrandFilterChange}
          >
            <SelectTrigger className="w-full md:w-[180px]">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                <SelectValue placeholder="Filter by brand" />
              </div>
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
      </div>
      
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 flex items-center gap-1">
            <Check className="h-3 w-3" />
            <span className="text-sm font-medium">
              {selectedCount} of {totalCount} selected
            </span>
          </Badge>
          {filterBrandId !== 'all' && (
            <Badge variant="secondary" className="px-3 py-1">
              Brand filtered
            </Badge>
          )}
          {searchQuery && (
            <Badge variant="secondary" className="px-3 py-1">
              Search active
            </Badge>
          )}
        </div>
        
        <Select 
          value={sortBy} 
          onValueChange={onSortChange}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name (A-Z)</SelectItem>
            <SelectItem value="name-desc">Name (Z-A)</SelectItem>
            <SelectItem value="brand">Brand</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
