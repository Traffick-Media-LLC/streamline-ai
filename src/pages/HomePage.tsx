
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ExternalLink } from "lucide-react"

const HomePage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-4">
      <h1 className="text-4xl font-bold mb-4">Welcome to Streamline Group Portal</h1>
      
      <div className="max-w-4xl mx-auto mb-8 space-y-8">
        <p className="text-lg text-muted-foreground mb-6">
          Your comprehensive platform for managing and verifying product legality across different states. 
          Access our interactive state map, chat with AI for instant support, and manage product databases efficiently.
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Main Navigation Cards */}
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

        {/* Employee Resources Section */}
        <div className="mt-12">
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <span>Sales Sheets</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <span>POS Materials</span>
                <ExternalLink className="h-4 w-4" />
              </a>
              <a 
                href="#" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <span>One Sheets</span>
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Marketing Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-muted-foreground">
                Need marketing materials or have a marketing request? Submit your request using our online form.
              </p>
              <a 
                href="https://slgmarketing.paperform.co/"
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-lg hover:bg-black/90 transition-colors"
              >
                Submit Marketing Request
                <ExternalLink className="h-4 w-4" />
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
