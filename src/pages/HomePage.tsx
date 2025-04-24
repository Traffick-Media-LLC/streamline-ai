
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ExternalLink, Map, MessageSquare } from "lucide-react"

const HomePage = () => {
  return (
    <div className="flex flex-col items-center min-h-[80vh] p-4 md:p-8 bg-gradient-to-b from-white to-gray-50">
      <div className="w-full max-w-7xl mx-auto">
        <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient 
          bg-clip-text text-transparent bg-gradient 
          bg-gradient-to-r from-black to-gray-600">
          Welcome to Streamline Group Portal
        </h1>
        
        <div className="max-w-4xl mx-auto mb-12 space-y-12">
          <p className="text-lg md:text-xl text-muted-foreground text-center max-w-2xl mx-auto">
            Your comprehensive platform for managing and verifying product legality across different states. 
            Access our interactive state map, chat with AI for instant support, and manage product databases efficiently.
          </p>
          
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
    </div>
  );
};

export default HomePage;
