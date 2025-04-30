
import { useState } from "react";
import { useChatContext } from "@/contexts/ChatContext";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import DriveSetupRequired from "./DriveSetupRequired";

interface FileSearchBarProps {
  className?: string;
}

const FileSearchBar = ({ className }: FileSearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { searchDriveFiles, showDriveSetupInstructions, sharedDriveId } = useChatContext();

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.trim() === "") {
      toast.error("Please enter a search term");
      return;
    }

    try {
      setIsSearching(true);
      
      if (searchDriveFiles) {
        await searchDriveFiles(searchQuery);
      } else {
        toast.error("File search functionality is not available");
        if (showDriveSetupInstructions) {
          showDriveSetupInstructions();
        }
      }
    } catch (error) {
      console.error("Error searching files:", error);
      toast.error(`Error searching files: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Show setup required message if Google Drive isn't configured
  const isDriveConfigured = !!sharedDriveId;

  return (
    <div className={className || ""}>
      {!isDriveConfigured && (
        <DriveSetupRequired onSetupHelp={showDriveSetupInstructions} />
      )}
      
      <div className="flex gap-2">
        <Input
          placeholder="Search for files in Drive..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isSearching}
          className="flex-1"
        />
        <Button 
          variant="outline" 
          size="icon" 
          onClick={handleSearch}
          disabled={isSearching}
        >
          <Search size={16} className={isSearching ? "animate-spin" : ""} />
        </Button>
      </div>
    </div>
  );
};

export default FileSearchBar;
