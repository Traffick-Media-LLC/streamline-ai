
import { FileText, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FileResult {
  id: string;
  name: string;
  fileType: string;
  webLink?: string;
  thumbnailLink?: string;
}

interface FileSearchResultsProps {
  results: FileResult[];
  onSelectFiles?: (fileIds: string[]) => void;
}

const FileSearchResults = ({ results, onSelectFiles }: FileSearchResultsProps) => {
  if (!results || results.length === 0) {
    return null;
  }

  const handleSelectAll = () => {
    if (onSelectFiles) {
      onSelectFiles(results.map(file => file.id));
    }
  };

  return (
    <div className="p-3 border rounded-md bg-muted/10 space-y-3 my-3">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-medium">
          Found {results.length} file{results.length !== 1 ? 's' : ''}
        </h3>
        {onSelectFiles && (
          <Button variant="outline" size="sm" onClick={handleSelectAll}>
            Select All
          </Button>
        )}
      </div>
      
      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {results.map((file) => (
          <div 
            key={file.id}
            className="p-2 border bg-background rounded-md flex items-center gap-3"
          >
            <div className="flex-shrink-0">
              <FileText size={20} className="text-blue-500" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{file.name}</p>
                <Badge variant="outline" className="text-xs">
                  {file.fileType}
                </Badge>
              </div>
            </div>
            
            {file.webLink && (
              <a 
                href={file.webLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary ml-2"
              >
                <ExternalLink size={16} />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default FileSearchResults;
