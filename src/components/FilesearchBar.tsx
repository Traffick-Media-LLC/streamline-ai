
import { useState } from "react";
import { useChatContext } from "@/contexts/ChatContext";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

interface FileSearchBarProps {
  className?: string;
}

const FileSearchBar = ({ className }: FileSearchBarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { searchDriveFiles } = useChatContext();

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

  return (
    <div className={`flex gap-2 ${className || ""}`}>
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
  );
};

export default FileSearchBar;
