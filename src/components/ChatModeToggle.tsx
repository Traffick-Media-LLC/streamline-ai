
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ChatModeToggleProps {
  mode: "simple" | "complex";
  onModeChange: (mode: "simple" | "complex") => void;
}

const ChatModeToggle = ({ mode, onModeChange }: ChatModeToggleProps) => {
  return (
    <div className="flex justify-center mb-4">
      <ToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => {
          if (value) onModeChange(value as "simple" | "complex");
        }}
        className="border rounded-lg"
      >
        <ToggleGroupItem value="simple" aria-label="Simple mode">
          Simple
        </ToggleGroupItem>
        <ToggleGroupItem value="complex" aria-label="Complex mode">
          Complex
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
};

export default ChatModeToggle;
