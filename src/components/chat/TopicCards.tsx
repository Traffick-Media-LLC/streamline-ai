
import { Button } from "@/components/ui/button";

interface TopicCardsProps {
  onSelectTopic: (topic: string) => void;
}

const TopicCards = ({ onSelectTopic }: TopicCardsProps) => {
  const suggestedTopics = [
    "Are Juice Head pouches legal in Texas?",
    "Where can I find our latest sales brochures?",
    "What are the regulations for nicotine products in California?",
    "Is Delta-8 legal in Florida for our distributors?",
    "What ingredients are in our Streamline vape products?"
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
