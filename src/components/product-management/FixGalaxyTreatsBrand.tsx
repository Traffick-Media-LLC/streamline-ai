
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { Check, AlertTriangle, RefreshCw } from "lucide-react";
import { invalidateProductQueries } from "@/lib/react-query-client";

export default function FixGalaxyTreatsBrand() {
  const [isFixing, setIsFixing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<{
    productsReassigned: number;
    ingredientsReassigned: number;
    brandDeleted: boolean;
  } | null>(null);

  const fixBrandAssociation = async () => {
    setIsFixing(true);
    setStatus('idle');
    setResult(null);
    
    try {
      // 1. Get info about the correct and incorrect brands
      const { data: brands, error: brandError } = await supabase
        .from("brands")
        .select("id, name")
        .in("id", [2, 11]);
        
      if (brandError) throw brandError;
      
      const correctBrand = brands?.find(b => b.id === 2);
      const incorrectBrand = brands?.find(b => b.id === 11);
      
      if (!correctBrand || !incorrectBrand) {
        toast.error("Couldn't find the required brand entries with IDs 2 and 11.");
        setStatus('error');
        setIsFixing(false);
        return;
      }
      
      console.log(`Correct brand: ${correctBrand.name} (ID: ${correctBrand.id})`);
      console.log(`Incorrect brand: ${incorrectBrand.name} (ID: ${incorrectBrand.id})`);
      
      // 2. Get all products associated with brand ID 11
      const { data: productsToFix, error: productsError } = await supabase
        .from("products")
        .select("id, name")
        .eq("brand_id", incorrectBrand.id);
        
      if (productsError) throw productsError;
      
      if (!productsToFix || productsToFix.length === 0) {
        toast.warning("No products found associated with brand ID 11.");
        setResult({
          productsReassigned: 0,
          ingredientsReassigned: 0,
          brandDeleted: false
        });
        setStatus('success');
        setIsFixing(false);
        return;
      }
      
      console.log(`Found ${productsToFix.length} products to reassign`);
      
      // Counters for tracking changes
      let productsReassigned = 0;
      let ingredientsReassigned = 0;
      
      // 3. For each product, check if a duplicate exists with brand ID 2
      for (const product of productsToFix) {
        const { data: potentialDuplicates, error: dupError } = await supabase
          .from("products")
          .select("id, name")
          .eq("brand_id", correctBrand.id)
          .ilike("name", product.name);
          
        if (dupError) throw dupError;
        
        if (potentialDuplicates && potentialDuplicates.length > 0) {
          // Product already exists with correct brand - reassign ingredients
          const correctProductId = potentialDuplicates[0].id;
          
          // First, get any ingredients associated with the incorrect product
          const { data: ingredientsToMove, error: ingredientsError } = await supabase
            .from("product_ingredients")
            .select("*")
            .eq("product_id", product.id);
            
          if (ingredientsError) throw ingredientsError;
          
          if (ingredientsToMove && ingredientsToMove.length > 0) {
            // Check if the correct product already has ingredients
            const { data: existingIngredients, error: existIngError } = await supabase
              .from("product_ingredients")
              .select("id")
              .eq("product_id", correctProductId);
              
            if (existIngError) throw existIngError;
            
            if (existingIngredients && existingIngredients.length === 0) {
              // No ingredients yet for correct product, move them over
              for (const ingredient of ingredientsToMove) {
                const { error: updateError } = await supabase
                  .from("product_ingredients")
                  .update({ product_id: correctProductId })
                  .eq("id", ingredient.id);
                  
                if (updateError) throw updateError;
                ingredientsReassigned++;
              }
            } else {
              // Ingredients already exist for correct product, just delete the incorrect ones
              const { error: deleteIngredientsError } = await supabase
                .from("product_ingredients")
                .delete()
                .in("id", ingredientsToMove.map(i => i.id));
                
              if (deleteIngredientsError) throw deleteIngredientsError;
            }
          }
          
          // Delete the duplicate product
          const { error: deleteProductError } = await supabase
            .from("products")
            .delete()
            .eq("id", product.id);
            
          if (deleteProductError) throw deleteProductError;
          
        } else {
          // No duplicate exists, just update the brand ID
          const { error: updateProductError } = await supabase
            .from("products")
            .update({ brand_id: correctBrand.id })
            .eq("id", product.id);
            
          if (updateProductError) throw updateProductError;
          productsReassigned++;
        }
      }
      
      // 4. Check if there are any more products with brand ID 11
      const { data: remainingProducts, error: remainingError } = await supabase
        .from("products")
        .select("id")
        .eq("brand_id", incorrectBrand.id);
        
      if (remainingError) throw remainingError;
      
      let brandDeleted = false;
      
      // 5. Delete brand ID 11 if no products are associated with it
      if (!remainingProducts || remainingProducts.length === 0) {
        const { error: deleteBrandError } = await supabase
          .from("brands")
          .delete()
          .eq("id", incorrectBrand.id);
          
        if (deleteBrandError) throw deleteBrandError;
        brandDeleted = true;
      }
      
      // 6. Invalidate all product-related queries to refresh the data
      await invalidateProductQueries();
      
      // Set results and status
      setResult({
        productsReassigned,
        ingredientsReassigned,
        brandDeleted
      });
      
      setStatus('success');
      toast.success("Successfully fixed Galaxy Treats brand association!");
      
    } catch (err: any) {
      console.error("Error fixing brand association:", err);
      toast.error(`Failed to fix brand association: ${err.message || "Unknown error"}`);
      setStatus('error');
    } finally {
      setIsFixing(false);
    }
  };

  return (
    <Card className="w-full max-w-xl mx-auto">
      <CardHeader>
        <CardTitle>Fix Galaxy Treats Brand Association</CardTitle>
        <CardDescription>
          This utility will reassign products from brand ID 11 to the correct Galaxy Treats brand ID 2,
          and delete the duplicate brand entry if possible.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status === 'success' && result && (
          <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-900/20">
            <Check className="h-4 w-4 text-green-500" />
            <AlertTitle>Operation Complete</AlertTitle>
            <AlertDescription>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>{result.productsReassigned} products reassigned to brand ID 2</li>
                <li>{result.ingredientsReassigned} ingredients reassigned</li>
                <li>Brand ID 11 {result.brandDeleted ? 'was deleted' : 'could not be deleted (still has products)'}</li>
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'error' && (
          <Alert className="mb-4 border-red-500 bg-red-50 dark:bg-red-900/20">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              There was an error fixing the brand association. Please check the console for details.
            </AlertDescription>
          </Alert>
        )}
        
        <p className="text-sm mb-4">
          This utility addresses the issue where Galaxy Treats products were incorrectly associated with brand ID 11
          instead of the correct brand ID 2. Running this will:
        </p>
        
        <ol className="list-decimal pl-5 text-sm space-y-1">
          <li>Reassign products from brand ID 11 to brand ID 2</li>
          <li>Handle any duplicate products and ingredient data</li>
          <li>Delete brand ID 11 if no products remain associated with it</li>
          <li>Refresh all product-related data in the application</li>
        </ol>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={fixBrandAssociation} 
          disabled={isFixing}
          className="w-full"
        >
          {isFixing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Fixing...
            </>
          ) : (
            'Fix Brand Association'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
