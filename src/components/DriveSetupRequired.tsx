
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DriveSetupRequiredProps {
  onSetupHelp: () => void;
}

const DriveSetupRequired = ({ onSetupHelp }: DriveSetupRequiredProps) => {
  return (
    <Alert className="mb-4 bg-amber-50 border-amber-300">
      <AlertTriangle className="h-4 w-4 text-amber-500" />
      <AlertTitle className="font-medium text-amber-800">Google Drive Integration Not Available</AlertTitle>
      <AlertDescription className="mt-2 text-amber-700">
        <p className="mb-2">
          This feature requires Google Drive credentials to be properly configured in Supabase.
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-amber-400 text-amber-700 hover:bg-amber-100"
          onClick={onSetupHelp}
        >
          View Setup Instructions
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DriveSetupRequired;
