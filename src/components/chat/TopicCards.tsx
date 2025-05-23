
import { Button } from "@/components/ui/button";

interface TopicCardsProps {
  onSelectTopic: (topic: string) => void;
}

const TopicCards = ({ onSelectTopic }: TopicCardsProps) => {
  const suggestedTopics = [
    "Are Juice Head pouches legal in New York?",
    "Why were disposables banned in California?",
    "Can you send me the Galaxy Treats sales sheet?",
    "What's our stance on synthetic nicotine in Minnesota?"
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
