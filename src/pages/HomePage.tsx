
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
      <h1 className="text-4xl font-bold mb-4">Welcome to Streamline Group Portal</h1>
      
      <div className="max-w-2xl mx-auto mb-8">
        <p className="text-lg text-muted-foreground mb-6">
          Your comprehensive platform for managing and verifying product legality across different states. 
          Access our interactive state map, chat with AI for instant support, and manage product databases efficiently.
        </p>
        
        <div className="grid gap-4 md:grid-cols-2 max-w-lg mx-auto">
          <Link to="/map">
            <Button variant="outline" className="w-full">
              Explore State Map
            </Button>
          </Link>
          <Link to="/chat">
            <Button variant="outline" className="w-full">
              AI Assistant
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
