
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";
import { FileUp } from "lucide-react";

type CsvEntry = {
  title: string;
  content: string;
  tags?: string;
};

const batchSize = 15; // To avoid too many requests at once

export default function KnowledgeCsvUploader({ onComplete }: { onComplete: () => void }) {
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

    Papa.parse<CsvEntry>(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const entries = results.data.filter(row => row.title && row.content);          
          if (!entries.length) {
            toast.error("No valid entries found in the CSV.");
            setUploading(false);
            return;
          }

          let successCount = 0;
          for (let i = 0; i < entries.length; i += batchSize) {
            const batch = entries.slice(i, i + batchSize);
            const insertData = batch.map((row) => ({
              title: row.title,
              content: row.content,
              tags: row.tags ? row.tags.split(",").map(tag => tag.trim()) : [],
              is_active: true,
            }));

            const { error } = await supabase
              .from("knowledge_entries")
              .insert(insertData);

            if (error) {
              toast.error(`Error at row ${i + 1}: ${error.message}`);
              setUploading(false);
              return;
            }
            successCount += insertData.length;
          }

          toast.success(`Uploaded ${successCount} knowledge entries.`);
          setSelectedFile(null);
          onComplete();
        } catch (err: any) {
          toast.error("Failed to parse or upload CSV.");
        } finally {
          setUploading(false);
          setSelectedFile(null);
        }
      },
      error: () => {
        toast.error("Failed to parse the CSV file.");
        setUploading(false);
        setSelectedFile(null);
      }
    });
  };

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div>
        <label className="block text-sm font-medium mb-1">Bulk Upload (CSV)</label>
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
          Required columns: <span className="font-mono">title</span>, <span className="font-mono">content</span>, <span className="font-mono">tags</span> (comma-separated, optional)
        </p>
      </div>
    </div>
  );
}
