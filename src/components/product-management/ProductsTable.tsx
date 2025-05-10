
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { Product } from '@/types/statePermissions';
import { Badge } from '@/components/ui/badge';

interface ProductsTableProps {
  products: Product[];
  selectedProducts: number[];
  onToggleProduct: (productId: number) => void;
}

export const ProductsTable: React.FC<ProductsTableProps> = ({
  products,
  selectedProducts,
  onToggleProduct
}) => {
  if (products.length === 0) {
    return (
      <div className="border rounded-md p-8 text-center">
        <p className="text-muted-foreground">No products match your filters</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[70px] text-center">Select</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Brand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => {
            const isSelected = selectedProducts.includes(product.id);
            
            return (
              <TableRow 
                key={product.id}
                className={isSelected ? 'bg-primary/5 hover:bg-primary/10' : ''}
              >
                <TableCell className="text-center">
                  <Button
                    variant={isSelected ? "default" : "outline"}
                    size="icon"
                    className={`h-8 w-8 rounded-full transition-all ${
                      isSelected ? 'bg-primary text-primary-foreground' : ''
                    }`}
                    onClick={() => onToggleProduct(product.id)}
                  >
                    {isSelected && <Check className="h-4 w-4" />}
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{product.name}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {product.brand?.logo_url ? (
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={product.brand.logo_url} alt={product.brand?.name} />
                        <AvatarFallback>{product.brand?.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                    ) : product.brand ? (
                      <Badge variant="outline" className="h-6 w-6 p-0 flex items-center justify-center rounded-full">
                        {product.brand.name.charAt(0)}
                      </Badge>
                    ) : null}
                    <span>{product.brand?.name || 'Unknown'}</span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
