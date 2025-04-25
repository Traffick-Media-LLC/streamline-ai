
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Check } from "lucide-react";
import { Product } from '@/types/statePermissions';

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
  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">Select</TableHead>
            <TableHead>Product</TableHead>
            <TableHead>Brand</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <Button
                  variant="outline"
                  size="icon"
                  className={selectedProducts.includes(product.id) ? 'bg-primary text-primary-foreground border-primary' : ''}
                  onClick={() => onToggleProduct(product.id)}
                >
                  {selectedProducts.includes(product.id) && <Check className="h-4 w-4" />}
                </Button>
              </TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {product.brand?.logo_url && (
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={product.brand.logo_url} alt={product.brand?.name} />
                      <AvatarFallback>{product.brand?.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                  )}
                  {product.brand?.name || 'Unknown'}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
