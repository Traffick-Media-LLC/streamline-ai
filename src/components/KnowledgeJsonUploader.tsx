
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { FileUp } from "lucide-react";

export default function KnowledgeJsonUploader({ onComplete }: { onComplete: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Please select a JSON file first");
      return;
    }

    setUploading(true);
    
    try {
      // Read the file content
      const fileText = await selectedFile.text();
      let jsonData;
      
      try {
        jsonData = JSON.parse(fileText);
      } catch (err) {
        toast.error("Invalid JSON format");
        setUploading(false);
        return;
      }
      
      // Validate the JSON structure
      if (!jsonData || typeof jsonData !== 'object') {
        toast.error("Invalid JSON structure");
        setUploading(false);
        return;
      }
      
      // Prepare the knowledge entry
      const title = selectedFile.name.replace('.json', '');
      const content = fileText; // Store the raw JSON string
      
      // Auto-generate tags based on JSON structure
      const tags = ['json'];
      
      // Add key names from top-level as tags
      if (typeof jsonData === 'object' && !Array.isArray(jsonData)) {
        Object.keys(jsonData).forEach(key => {
          if (!tags.includes(key)) {
            tags.push(key);
          }
        });
      }
      
      // Insert into knowledge_entries
      const { error } = await supabase
        .from("knowledge_entries")
        .insert({
          title,
          content,
          tags,
          is_active: true,
        });

      if (error) {
        toast.error(`Error uploading JSON: ${error.message}`);
        console.error("Error uploading JSON:", error);
        return;
      }
      
      toast.success("JSON data added to knowledge base");
      setSelectedFile(null);
      
      // Reset the file input - fixing the error here by removing references to 'e'
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      onComplete();
    } catch (err: any) {
      toast.error("Failed to process the JSON file");
      console.error("JSON upload error:", err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mb-4 flex flex-col gap-2">
      <div>
        <label className="block text-sm font-medium mb-1">JSON Upload</label>
        <div className="flex items-end gap-2">
          <Input 
            type="file" 
            accept=".json" 
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
          Upload JSON data to be included in the knowledge base. Data will be stored as structured content.
        </p>
      </div>
    </div>
  );
}
