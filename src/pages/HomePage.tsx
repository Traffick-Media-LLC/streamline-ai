import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ExternalLink, Map, MessageSquare } from "lucide-react"

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <div className="relative">
        <div className="flex flex-col md:flex-row items-center max-w-7xl mx-auto px-4 py-12 md:py-24">
          {/* Left Content */}
          <div className="w-full md:w-1/2 space-y-6 md:pr-12">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-blue-500">
              Streamline Group Portal
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Your comprehensive platform for managing and verifying product legality across different states. 
              Access our interactive state map, chat with AI for instant support, and manage product databases efficiently.
            </p>
            <div className="flex gap-4">
              <Link to="/map">
                <Button size="lg" className="bg-red-500 hover:bg-red-600">
                  Explore Map
                </Button>
              </Link>
              <Link to="/chat">
                <Button size="lg" variant="outline" className="border-red-500 text-red-500 hover:bg-red-50">
                  Start Chat
                </Button>
              </Link>
            </div>
          </div>
          
          {/* Right Image */}
          <div className="w-full md:w-1/2 mt-8 md:mt-0">
            <div className="relative rounded-lg overflow-hidden shadow-2xl">
              <img 
                src="/lovable-uploads/82b6b84f-934d-49af-88ae-b539479ec3a9.png"
                alt="Streamline Group Display"
                className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        {/* Main Navigation Cards */}
        <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
          <Link to="/map" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <Map className="h-12 w-12 text-black/80 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold">Explore State Map</h3>
                <p className="text-muted-foreground">
                  Interactive map for managing product legality across states
                </p>
              </CardContent>
            </Card>
          </Link>
          <Link to="/chat" className="group">
            <Card className="h-full transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
              <CardContent className="p-6 flex flex-col items-center text-center space-y-4">
                <MessageSquare className="h-12 w-12 text-black/80 group-hover:scale-110 transition-transform" />
                <h3 className="text-xl font-semibold">AI Assistant</h3>
                <p className="text-muted-foreground">
                  Get instant support and answers to your questions
                </p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Employee Resources Section */}
        <div className="space-y-8">
          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
            <CardHeader>
              <CardTitle className="text-2xl">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {[
                { title: "Sales Sheets", description: "Access all sales materials" },
                { title: "POS Materials", description: "Point of sale resources" },
                { title: "One Sheets", description: "Product information sheets" }
              ].map((link) => (
                <a 
                  key={link.title}
                  href="#" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="group p-4 rounded-xl border bg-white/50 hover:bg-white 
                    transition-all duration-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{link.title}</span>
                    <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-black transition-colors" />
                  </div>
                  <p className="text-sm text-muted-foreground">{link.description}</p>
                </a>
              ))}
            </CardContent>
          </Card>

          <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-black to-gray-800 text-white">
            <CardHeader>
              <CardTitle className="text-2xl">Marketing Requests</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-gray-300">
                Need marketing materials or have a marketing request? Submit your request using our online form.
              </p>
              <a 
                href="https://slgmarketing.paperform.co/"
                target="_blank" 
                rel="noopener noreferrer" 
                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg 
                  hover:bg-gray-100 transition-colors font-medium"
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
