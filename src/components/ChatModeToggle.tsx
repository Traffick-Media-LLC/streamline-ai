
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface ChatModeToggleProps {
  mode: "simple" | "complex";
  onModeChange: (mode: "simple" | "complex") => void;
}

const ChatModeToggle = ({ mode, onModeChange }: ChatModeToggleProps) => {
  return (
    <div className="flex items-center justify-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Label htmlFor="mode-toggle" className="text-sm font-medium">
          Simple
        </Label>
        <Switch
          id="mode-toggle"
          checked={mode === "complex"}
          onCheckedChange={(checked) => onModeChange(checked ? "complex" : "simple")}
          className="data-[state=checked]:bg-primary"
        />
        <Label htmlFor="mode-toggle" className="text-sm font-medium">
          Complex
        </Label>
      </div>
    </div>
  );
};

export default ChatModeToggle;

