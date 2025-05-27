

import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { ExternalLink, Flag } from "lucide-react"
import { Animated, AnimatedImage, AnimatedList } from "@/components/ui/animated"
import { Skeleton } from "@/components/ui/skeleton"
import { useState, useEffect } from "react"
import { usePerformance } from "@/contexts/PerformanceContext"

const HomePage = () => {
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const { measurePerformance, prefetchRoute } = usePerformance();

  // Measure component render performance
  useEffect(() => {
    measurePerformance('HomePage-render');
    
    // Simulate images loaded after a short delay in development
    // In production this would be handled by actual image loading events
    const timer = setTimeout(() => {
      setImagesLoaded(true);
      measurePerformance('HomePage-images-loaded');
    }, 300);

    return () => clearTimeout(timer);
  }, [measurePerformance]);

  // Prefetch map route when HomePage is mounted
  useEffect(() => {
    prefetchRoute('/map');
  }, [prefetchRoute]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-gray-50">
      {/* Hero Section */}
      <Animated type="fade" className="relative">
        <div className="flex flex-col md:flex-row items-center max-w-7xl mx-auto px-4 py-12 md:py-24">
          {/* Left Content */}
          <Animated type="slide-in" delay={0.2} className="w-full md:w-1/2 space-y-6 md:pr-12">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-black-primary">
              Streamline Group Portal
            </h1>
            <p className="text-lg md:text-xl text-gray-600">
              Your comprehensive platform for managing and verifying product legality across different states. 
              Access our interactive state map, chat with AI for instant support, and manage product databases efficiently.
            </p>
            <div className="flex gap-4">
              <Link to="/map" 
                onMouseEnter={() => prefetchRoute('/map')}
              >
                <Button size="lg" className="bg-red-500 hover:bg-red-600 transition-all duration-300">
                  Explore Map
                </Button>
              </Link>
            </div>
          </Animated>
          
          {/* Right Image */}
          <div className="w-full md:w-1/2 mt-8 md:mt-0">
            <Animated type="scale" delay={0.4} className="relative rounded-lg overflow-hidden shadow-2xl">
              {!imagesLoaded ? (
                <Skeleton className="w-full aspect-video" />
              ) : (
                <img 
                  src="/lovable-uploads/82b6b84f-934d-49af-88ae-b539479ec3a9.png"
                  alt="Streamline Group Display"
                  width={600}
                  height={400}
                  className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-500"
                  loading="eager" // This is the hero image, so we load it eagerly
                />
              )}
            </Animated>
          </div>
        </div>
      </Animated>

      {/* Employee Resources Section */}
      <div className="max-w-7xl mx-auto px-4 py-12 space-y-12">
        <div className="space-y-8">
          {/* Marketing Requests card */}
          <Animated type="slide-up" threshold={0.1}>
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-black to-gray-800 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Marketing Requests</CardTitle>
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
          </Animated>

          {/* IT Requests card */}
          <Animated type="slide-up" threshold={0.1} delay={0.1}>
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">IT Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-blue-100">
                  Need technical support or have an IT request? Submit your request for hardware, software, or technical assistance.
                </p>
                <a 
                  href="https://go.streamlinevape.com/it"
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-white text-blue-800 px-6 py-3 rounded-lg 
                    hover:bg-gray-100 transition-colors font-medium"
                >
                  Submit IT Request
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          </Animated>

          {/* Quick Links card - Fixed styling */}
          <Animated type="slide-up" threshold={0.1} delay={0.2}>
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
              <CardHeader>
                <CardTitle className="text-2xl">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { title: "Sales Sheets", description: "Access all sales materials" },
                    { title: "POS Materials", description: "Point of sale resources" },
                    { title: "One Sheets", description: "Product information sheets" }
                  ].map((link, index) => (
                    <Animated key={link.title} type="scale" delay={0.1 * index}>
                      <a 
                        href="#" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="group p-4 rounded-xl border bg-white shadow-sm hover:bg-white 
                          transition-all duration-300 hover:shadow-md flex flex-col h-full"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-black">{link.title}</span>
                          <ExternalLink className="h-4 w-4 text-gray-400 group-hover:text-black transition-colors" />
                        </div>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </a>
                    </Animated>
                  ))}
                </div>
              </CardContent>
            </Card>
          </Animated>

          {/* Racing Section */}
          <Animated type="slide-up" threshold={0.05} delay={0.3}>
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Content Side */}
                <div className="p-8 flex flex-col justify-center space-y-6">
                  <div>
                    <CardTitle className="text-3xl mb-4">
                      Streamline Group Racing: The Ultimate Sales Advantage
                    </CardTitle>
                    <p className="text-gray-600">
                      Streamline Group Racing isn't just about speed—it's a powerful sales tool that sets us apart from every competitor. As part of the Streamline team, you now have access to a one-of-a-kind platform that helps you build relationships, impress clients, and close more deals. This isn't a sponsorship—it's a strategic edge.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-xl font-semibold mb-4">How you can use it:</h4>
                    <ul className="space-y-3 text-gray-600">
                      <li className="flex items-start gap-2">
                        <Flag className="h-5 w-5 mt-1 text-red-500 flex-shrink-0" />
                        <span>Bring clients to races for exclusive, high-impact experiences</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Flag className="h-5 w-5 mt-1 text-red-500 flex-shrink-0" />
                        <span>Feature your clients as placements on the car</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Flag className="h-5 w-5 mt-1 text-red-500 flex-shrink-0" />
                        <span>Leverage the excitement of racing to open new conversations</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Flag className="h-5 w-5 mt-1 text-red-500 flex-shrink-0" />
                        <span>Align your pitch with our values of precision, speed, and excellence</span>
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Image Side */}
                <div className="relative h-full min-h-[300px] md:min-h-0">
                  {!imagesLoaded ? (
                    <Skeleton className="w-full h-full" />
                  ) : (
                    <AnimatedImage 
                      src="/lovable-uploads/84e0fd80-b14f-4f1d-9dd9-b248e7c6014e.png"
                      alt="Streamline Group Racing Team"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>
            </Card>
          </Animated>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

