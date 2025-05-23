
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { FileUp } from "lucide-react";

type DriveFileCsvEntry = {
  Brand: string;
  Category: string;
  "Subcategory 1"?: string;
  "Subcategory 2"?: string;
  "Subcategory 3"?: string;
  "Subcategory 4"?: string;
  "Subcategory 5"?: string;
  "Subcategory 6"?: string;
  "File Name": string;
  "File URL"?: string;
  "MIME Type": string;
};

const batchSize = 20; // Process in batches to avoid overwhelming the database

export default function DriveFilesCsvUploader({ onComplete }: { onComplete: () => void }) {
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
      Papa.parse<DriveFileCsvEntry>(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const entries = results.data.filter(row => 
              row.Brand && row.Category && row["File Name"] && row["MIME Type"]
            );
            
            if (!entries.length) {
              toast.error("No valid entries found in the CSV. Ensure it has Brand, Category, File Name, and MIME Type columns.");
              setUploading(false);
              return;
            }

            let successCount = 0;
            
            // Process in batches
            for (let i = 0; i < entries.length; i += batchSize) {
              const batch = entries.slice(i, i + batchSize);
              
              // Process each file in the batch
              for (const file of batch) {
                try {
                  // Create a unique ID for the file
                  const fileId = crypto.randomUUID();
                  
                  // Insert the file record
                  const { error } = await supabase
                    .from("drive_files")
                    .insert({
                      id: fileId,
                      brand: file.Brand,
                      category: file.Category,
                      subcategory_1: file["Subcategory 1"] || null,
                      subcategory_2: file["Subcategory 2"] || null,
                      subcategory_3: file["Subcategory 3"] || null,
                      subcategory_4: file["Subcategory 4"] || null,
                      subcategory_5: file["Subcategory 5"] || null,
                      subcategory_6: file["Subcategory 6"] || null,
                      file_name: file["File Name"],
                      file_url: file["File URL"] || null,
                      mime_type: file["MIME Type"],
                      size_bytes: null, // This would be determined when actually uploading a file
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      last_accessed: new Date().toISOString()
                    });
                    
                  if (error) throw error;
                  successCount++;
                } catch (err: any) {
                  console.error(`Error processing ${file["File Name"]}:`, err);
                  toast.error(`Error with ${file["File Name"]}: ${err.message || "Unknown error"}`);
                }
              }
            }
            
            toast.success(`Successfully processed ${successCount} file records.`);
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
          Required columns: <span className="font-mono">Brand</span>, <span className="font-mono">Category</span>, <span className="font-mono">File Name</span>, <span className="font-mono">MIME Type</span>
          (optional: <span className="font-mono">Subcategory 1-6</span>, <span className="font-mono">File URL</span>)
        </p>
      </div>
    </div>
  );
}
