
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { FileUp } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { useAuth } from "@/contexts/AuthContext";

type DriveFileCsvEntry = {
  Brand?: string;
  Category?: string;
  "File Name"?: string;
  "File URL"?: string;
  "Mime Type"?: string;
  "Subcategory 1"?: string;
  "Subcategory 2"?: string;
  "Subcategory 3"?: string;
  "Subcategory 4"?: string;
  "Subcategory 5"?: string;
  "Subcategory 6"?: string;
};

const batchSize = 20; // Process in batches to avoid overwhelming the database

export default function DriveFilesCsvUploader({ onComplete }: { onComplete: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth(); // Get the authenticated user

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
    
    if (!user) {
      toast.error("You must be logged in to upload files");
      return;
    }
    
    setUploading(true);
    
    try {
      Papa.parse<DriveFileCsvEntry>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const entries = results.data;
            
            if (!entries.length) {
              toast.error("No entries found in the CSV.");
              setUploading(false);
              return;
            }

            // Log the first entry to understand what fields are available
            console.log("First CSV entry:", entries[0]);
            
            // Log the headers from the CSV for debugging
            console.log("CSV Headers:", Object.keys(entries[0]));

            let successCount = 0;
            let errorCount = 0;
            
            // Process in batches
            for (let i = 0; i < entries.length; i += batchSize) {
              const batch = entries.slice(i, i + batchSize);
              
              // Process each file entry in the batch
              const batchData = batch.map(entry => {
                // Make sure these values are never null to satisfy the non-null constraints
                const fileName = entry["File Name"] || `Unnamed File ${uuidv4().substring(0, 8)}`;
                const mimeType = entry["Mime Type"] || "application/octet-stream";
                
                return {
                  id: uuidv4(), // Generate a unique ID for each entry
                  brand: entry.Brand || null,
                  category: entry.Category || null,
                  file_name: fileName,
                  file_url: entry["File URL"] || null,
                  mime_type: mimeType,
                  subcategory_1: entry["Subcategory 1"] || null,
                  subcategory_2: entry["Subcategory 2"] || null,
                  subcategory_3: entry["Subcategory 3"] || null,
                  subcategory_4: entry["Subcategory 4"] || null,
                  subcategory_5: entry["Subcategory 5"] || null,
                  subcategory_6: entry["Subcategory 6"] || null
                };
              });
              
              try {
                const { data, error } = await supabase
                  .from("drive_files")
                  .insert(batchData);
                  
                if (error) {
                  console.error(`Error processing batch ${i / batchSize + 1}:`, error);
                  toast.error(`Error with batch ${i / batchSize + 1}: ${error.message || "Unknown error"}`);
                  errorCount++;
                } else {
                  successCount += batchData.length;
                }
              } catch (err: any) {
                console.error(`Error processing batch ${i / batchSize + 1}:`, err);
                toast.error(`Error with batch ${i / batchSize + 1}: ${err.message || "Unknown error"}`);
                errorCount++;
              }
            }
            
            if (successCount > 0) {
              toast.success(`Successfully processed ${successCount} file entries.`);
              onComplete();
            } else {
              toast.error("Failed to process any files. Please check the console for details.");
            }
            
            if (errorCount > 0) {
              toast.error(`Failed to process ${errorCount} batches. Check CSV format and console for details.`);
            }
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
        <label className="block text-sm font-medium mb-1">Drive Files Upload (CSV)</label>
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
          Required columns: <span className="font-mono">File Name</span>, <span className="font-mono">Mime Type</span>, 
          Optional columns: <span className="font-mono">Brand</span>, <span className="font-mono">Category</span>, 
          <span className="font-mono">File URL</span>, <span className="font-mono">Subcategory 1-6</span>
        </p>
      </div>
    </div>
  );
}
