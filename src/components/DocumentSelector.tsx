
import { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, FileText, Search, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import { Badge } from "@/components/ui/badge";

interface Document {
  id: string;
  name: string;
  file_type: string;
  last_accessed: string;
  description?: string;
}

interface DocumentSelectorProps {
  selectedDocuments: string[];
  onSelectDocument: (docIds: string[]) => void;
}

const DocumentSelector = ({ selectedDocuments, onSelectDocument }: DocumentSelectorProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('drive-integration', {
        body: { operation: 'list', limit: 20 },
      });

      if (error) throw new Error(error.message);
      
      setDocuments(data?.files || []);
    } catch (err) {
      console.error("Error fetching documents:", err);
      setError("Failed to load documents");
    } finally {
      setIsLoading(false);
    }
  };

  const syncWithDrive = async () => {
    setIsSyncing(true);
    setError(null);
    
    try {
      toast.info("Syncing with Google Drive...");
      
      const { data, error } = await supabase.functions.invoke('drive-integration', {
        body: { operation: 'sync' },
      });

      if (error) throw new Error(error.message);
      
      toast.success(`Drive sync completed. Processed ${data?.processed?.length || 0} files.`);
      
      // Refresh document list
      fetchDocuments();
    } catch (err) {
      console.error("Error syncing with Drive:", err);
      toast.error("Failed to sync with Google Drive");
      setError("Sync failed. Check console for details.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchDocuments();
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('drive-integration', {
        body: { 
          operation: 'search', 
          query: searchQuery,
          limit: 20 
        },
      });

      if (error) throw new Error(error.message);
      
      setDocuments(data?.files || []);
    } catch (err) {
      console.error("Error searching documents:", err);
      setError("Failed to search documents");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleDocumentSelection = (docId: string) => {
    if (selectedDocuments.includes(docId)) {
      onSelectDocument(selectedDocuments.filter(id => id !== docId));
    } else {
      onSelectDocument([...selectedDocuments, docId]);
    }
  };
  
  const getFileTypeBadge = (fileType: string) => {
    let color = "bg-blue-500";
    let label = "Document";
    
    if (fileType.includes('pdf')) {
      color = "bg-red-500";
      label = "PDF";
    } else if (fileType.includes('spreadsheet')) {
      color = "bg-green-500";
      label = "Spreadsheet";
    } else if (fileType.includes('presentation')) {
      color = "bg-yellow-500";
      label = "Presentation";
    } else if (fileType.includes('text')) {
      color = "bg-gray-500";
      label = "Text";
    }
    
    return (
      <Badge variant="secondary" className="text-xs">
        {label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col h-full border rounded-md">
      <div className="p-3 border-b flex justify-between">
        <div className="flex gap-2 flex-1">
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button variant="outline" size="icon" onClick={handleSearch}>
            <Search size={16} />
          </Button>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={syncWithDrive} 
          disabled={isSyncing}
          className="ml-2"
        >
          <RefreshCw size={16} className={`mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>
      </div>
      
      {error && (
        <div className="p-4 text-center text-red-500 text-sm">
          {error}
        </div>
      )}
      
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            Array(5).fill(0).map((_, i) => (
              <div key={i} className="p-2 flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            ))
          ) : documents.length > 0 ? (
            documents.map((doc) => (
              <button
                key={doc.id}
                onClick={() => toggleDocumentSelection(doc.id)}
                className={`p-2 flex items-start gap-3 w-full text-left rounded hover:bg-muted/50 transition-colors ${
                  selectedDocuments.includes(doc.id) ? 'bg-muted' : ''
                }`}
              >
                <div className="mt-1 relative">
                  <FileText size={18} className="text-blue-500" />
                  {selectedDocuments.includes(doc.id) && (
                    <CheckCircle2 size={12} className="absolute -right-1 -top-1 text-green-500 bg-background rounded-full" />
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    {getFileTypeBadge(doc.file_type)}
                  </div>
                  {doc.description && (
                    <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Last accessed: {new Date(doc.last_accessed).toLocaleDateString()}
                  </p>
                </div>
              </button>
            ))
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="mx-auto h-8 w-8 opacity-50 mb-2" />
              <p className="text-sm">No documents found</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={syncWithDrive} 
                className="mt-2"
              >
                Sync with Drive
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default DocumentSelector;
