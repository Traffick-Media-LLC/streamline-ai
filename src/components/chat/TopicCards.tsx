
import { Button } from "@/components/ui/button";

interface TopicCardsProps {
  onSelectTopic: (topic: string) => void;
}

const TopicCards = ({ onSelectTopic }: TopicCardsProps) => {
  const suggestedTopics = [
    "Is Delta-8 legal in Texas?",
    "Tell me about Brand X's products",
    "Do you have information about CBD regulations?",
    "Which states allow THC products?"
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {suggestedTopics.map((topic, index) => (
        <Button
          key={index}
          variant="outline"
          className="h-auto p-4 text-left justify-start whitespace-normal"
          onClick={() => onSelectTopic(topic)}
        >
          {topic}
        </Button>
      ))}
    </div>
  );
};

export default TopicCards;
