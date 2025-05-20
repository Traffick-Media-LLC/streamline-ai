
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { FileUp } from "lucide-react";

type IngredientCsvEntry = {
  Brand: string;
  "Product Type": string;
  Product: string;
  "Ingredient 1": string;
  "Ingredient 2"?: string;
  "Ingredient 3"?: string;
  "Ingredient 4"?: string;
  "Ingredient 5"?: string;
};

const batchSize = 20; // Process in batches to avoid overwhelming the database

export default function ProductIngredientCsvUploader({ onComplete }: { onComplete: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a CSV file first");
      return;
    }
    
    setUploading(true);
    
    try {
      Papa.parse<IngredientCsvEntry>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const entries = results.data.filter(row => 
              row.Brand && row["Product Type"] && row.Product && row["Ingredient 1"]
            );
            
            if (!entries.length) {
              toast.error("No valid entries found in the CSV. Ensure it has Brand, Product Type, Product, and Ingredient 1 columns.");
              setUploading(false);
              return;
            }

            // Process data by product
            const productMap = new Map();
            
            // Group by product
            entries.forEach(entry => {
              const key = `${entry.Brand}|${entry.Product}`;
              if (!productMap.has(key)) {
                productMap.set(key, {
                  brand: entry.Brand,
                  product: entry.Product,
                  productType: entry["Product Type"],
                  ingredients: {
                    ingredient1: entry["Ingredient 1"],
                    ingredient2: entry["Ingredient 2"] || null,
                    ingredient3: entry["Ingredient 3"] || null,
                    ingredient4: entry["Ingredient 4"] || null,
                    ingredient5: entry["Ingredient 5"] || null,
                  }
                });
              }
            });
            
            let successCount = 0;
            const productArray = Array.from(productMap.values());
            
            // Process in batches
            for (let i = 0; i < productArray.length; i += batchSize) {
              const batch = productArray.slice(i, i + batchSize);
              
              // Process each product in the batch
              for (const product of batch) {
                try {
                  // First find or create the brand
                  const { data: existingBrands, error: brandError } = await supabase
                    .from("brands")
                    .select("id")
                    .ilike("name", product.brand)
                    .limit(1);
                    
                  if (brandError) throw brandError;
                  
                  let brandId: number;
                  
                  if (existingBrands?.length === 0) {
                    // Create the brand
                    const { data: newBrand, error: createBrandError } = await supabase
                      .from("brands")
                      .insert({ name: product.brand })
                      .select("id")
                      .single();
                      
                    if (createBrandError) throw createBrandError;
                    brandId = newBrand.id;
                  } else {
                    brandId = existingBrands[0].id;
                  }
                  
                  // Now find or create the product
                  const { data: existingProducts, error: productError } = await supabase
                    .from("products")
                    .select("id")
                    .ilike("name", product.product)
                    .eq("brand_id", brandId)
                    .limit(1);
                    
                  if (productError) throw productError;
                  
                  let productId: number;
                  
                  if (existingProducts?.length === 0) {
                    // Create the product
                    const { data: newProduct, error: createProductError } = await supabase
                      .from("products")
                      .insert({ name: product.product, brand_id: brandId })
                      .select("id")
                      .single();
                      
                    if (createProductError) throw createProductError;
                    productId = newProduct.id;
                  } else {
                    productId = existingProducts[0].id;
                  }
                  
                  // Check if product ingredients already exist
                  const { data: existingIngredient, error: ingredientError } = await supabase
                    .from("product_ingredients")
                    .select("id")
                    .eq("product_id", productId)
                    .limit(1);
                    
                  if (ingredientError) throw ingredientError;
                  
                  // Insert or update product ingredients
                  if (existingIngredient?.length === 0) {
                    // Add new ingredients
                    const { error: createIngredientError } = await supabase
                      .from("product_ingredients")
                      .insert({
                        product_id: productId,
                        product_type: product.productType,
                        ingredient1: product.ingredients.ingredient1,
                        ingredient2: product.ingredients.ingredient2,
                        ingredient3: product.ingredients.ingredient3,
                        ingredient4: product.ingredients.ingredient4,
                        ingredient5: product.ingredients.ingredient5
                      });
                      
                    if (createIngredientError) throw createIngredientError;
                  } else {
                    // Update existing ingredients
                    const { error: updateIngredientError } = await supabase
                      .from("product_ingredients")
                      .update({
                        product_type: product.productType,
                        ingredient1: product.ingredients.ingredient1,
                        ingredient2: product.ingredients.ingredient2,
                        ingredient3: product.ingredients.ingredient3,
                        ingredient4: product.ingredients.ingredient4,
                        ingredient5: product.ingredients.ingredient5
                      })
                      .eq("id", existingIngredient[0].id);
                      
                    if (updateIngredientError) throw updateIngredientError;
                  }
                  
                  successCount++;
                } catch (err: any) {
                  console.error(`Error processing ${product.brand} - ${product.product}:`, err);
                  toast.error(`Error with ${product.brand} - ${product.product}: ${err.message || "Unknown error"}`);
                }
              }
            }
            
            toast.success(`Successfully processed ${successCount} products with ingredients.`);
            onComplete();
          } catch (err: any) {
            console.error("Error processing CSV data:", err);
            toast.error(`Failed to process CSV: ${err.message || "Unknown error"}`);
          } finally {
            setUploading(false);
            setSelectedFile(null);
          }
        },
        error: (error) => {
          console.error("CSV parsing error:", error);
          toast.error(`Failed to parse the CSV file: ${error.message}`);
          setUploading(false);
          setSelectedFile(null);
        }
      });
    } catch (err: any) {
      console.error("Error during CSV upload:", err);
      toast.error(`Upload failed: ${err.message || "Unknown error"}`);
      setUploading(false);
      setSelectedFile(null);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div>
        <label className="block text-sm font-medium mb-1">Product Ingredients Upload (CSV)</label>
        <div className="flex items-end gap-2">
          <Input 
            type="file" 
            accept=".csv" 
            disabled={uploading} 
            onChange={handleFileChange} 
          />
          <Button 
            onClick={handleUpload} 
            disabled={uploading || !selectedFile}
            className="flex items-center gap-2"
          >
            <FileUp size={16} />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
        <p className="text-xs mt-1 text-muted-foreground">
          Required columns: <span className="font-mono">Brand</span>, <span className="font-mono">Product Type</span>, <span className="font-mono">Product</span>, <span className="font-mono">Ingredient 1</span> 
          (optional: <span className="font-mono">Ingredient 2-5</span>)
        </p>
      </div>
    </div>
  );
}
