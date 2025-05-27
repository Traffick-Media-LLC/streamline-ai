
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
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-red-600 to-red-800 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">IT Requests</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-red-100">
                  Need technical support or have an IT request? Submit your request for hardware, software, or technical assistance.
                </p>
                <a 
                  href="https://go.streamlinevape.com/it"
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-white text-red-800 px-6 py-3 rounded-lg 
                    hover:bg-gray-100 transition-colors font-medium"
                >
                  Submit IT Request
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          </Animated>

          {/* Brand Assets card - moved above Quick Links */}
          <Animated type="slide-up" threshold={0.1} delay={0.2}>
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-600 to-green-800 text-white">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Brand Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-green-100">
                  Access our complete library of brand assets including logos, brand guidelines, marketing materials, 
                  product images, and design templates. Everything you need to maintain brand consistency.
                </p>
                <a 
                  href="https://drive.google.com/drive/folders/1EoZyhbD_tBMe_h8q-YzVT60E-a-76eOr"
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="inline-flex items-center gap-2 bg-white text-green-800 px-6 py-3 rounded-lg 
                    hover:bg-gray-100 transition-colors font-medium"
                >
                  Access Brand Assets
                  <ExternalLink className="h-4 w-4" />
                </a>
              </CardContent>
            </Card>
          </Animated>

          {/* Quick Links card - moved below Brand Assets, delay updated */}
          <Animated type="slide-up" threshold={0.1} delay={0.25}>
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-gray-50 to-white">
              <CardHeader>
                <CardTitle className="text-2xl">Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  {[
                    { 
                      title: "Order Form", 
                      description: "Submit product orders and requests",
                      url: "https://docs.google.com/spreadsheets/d/1kcHHXzRuAKMeSsFg2k-LjZAwuuMYzsh6/edit?pli=1&gid=1609198106#gid=1609198106"
                    },
                    { 
                      title: "Pact Act Form", 
                      description: "Compliance and regulatory documentation",
                      url: "https://docs.google.com/spreadsheets/d/1-Yri86OKObZoEo2BQ8H5nDoEwvmQWEJdQFAx_Yei5EU/edit?gid=881087572#gid=881087572"
                    },
                    { 
                      title: "RMA Form", 
                      description: "Return merchandise authorization",
                      url: "https://form.jotform.com/242196101283046"
                    }
                  ].map((link, index) => (
                    <Animated key={link.title} type="scale" delay={0.1 * index}>
                      <a 
                        href={link.url} 
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

          {/* Combined Racing Section - delay updated to 0.3 */}
          <Animated type="slide-up" threshold={0.05} delay={0.3}>
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl overflow-hidden border-2 border-red-200 shadow-2xl">
              {/* Racing Introduction */}
              <div className="grid md:grid-cols-2 gap-6 mb-0">
                {/* Content Side */}
                <div className="p-8 flex flex-col justify-center space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-1 h-12 bg-red-500 rounded-full"></div>
                      <h2 className="text-3xl font-bold text-black-primary">
                        Streamline Group Racing: The Ultimate Sales Advantage
                      </h2>
                    </div>
                    <p className="text-gray-700 leading-relaxed">
                      Streamline Group Racing isn't just about speed—it's a powerful sales tool that sets us apart from every competitor. As part of the Streamline team, you now have access to a one-of-a-kind platform that helps you build relationships, impress clients, and close more deals. This isn't a sponsorship—it's a strategic edge.
                    </p>
                  </div>
                  
                  <div>
                    <h4 className="text-xl font-semibold mb-4 text-black-primary">How you can use it:</h4>
                    <ul className="space-y-3 text-gray-700">
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

              {/* Racing Stripe Divider */}
              <div className="relative">
                <div className="h-2 bg-gradient-to-r from-red-500 via-black to-red-500"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
              </div>

              {/* Our Drivers Section */}
              <div className="p-8 space-y-8 bg-gradient-to-br from-white/90 to-red-50/90">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-1 h-10 bg-red-500 rounded-full"></div>
                    <h3 className="text-3xl font-bold text-black-primary">Meet Our Drivers</h3>
                    <div className="w-1 h-10 bg-red-500 rounded-full"></div>
                  </div>
                  <p className="text-gray-700 max-w-3xl mx-auto">
                    These talented drivers represent Streamline Group on the track, bringing our brands to racing's biggest stages and creating unforgettable experiences for our clients.
                  </p>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8">
                  {/* Patrick Mulcahy Card */}
                  <Animated type="scale" delay={0.1}>
                    <Card className="overflow-hidden border-2 border-red-200 shadow-xl bg-white/95 backdrop-blur">
                      <div className="flex flex-col h-full">
                        {/* Driver Image - Fixed container */}
                        <div className="relative h-64 overflow-hidden bg-gray-100">
                          {!imagesLoaded ? (
                            <Skeleton className="w-full h-full" />
                          ) : (
                            <img 
                              src="/lovable-uploads/1fc217af-f0e9-42ec-b678-2c2c8a49858b.png"
                              alt="Patrick Mulcahy - Driver #54"
                              className="w-full h-full object-contain bg-white"
                            />
                          )}
                          {/* Driver Number Overlay */}
                          <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg border-2 border-white">
                            54
                          </div>
                        </div>
                        
                        {/* Driver Info */}
                        <CardContent className="p-6 flex-1 bg-gradient-to-b from-white to-red-50/30">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-2xl font-bold text-black-primary">Patrick Mulcahy</h4>
                              <p className="text-red-500 font-semibold text-lg">#54 • Porsche Carrera Cup</p>
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                              Patrick Mulcahy, CEO of Streamline Group, is making waves both in business and behind the wheel. 
                              As a driver in the Porsche Carrera Cup, Patrick races with GMG while representing Streamline's 
                              high-performance brands. His presence on the track isn't just competitive—it's strategic. With 
                              Streamline logos featured prominently, each race becomes a high-impact opportunity to engage 
                              clients, build relationships, and accelerate sales.
                            </p>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Animated>

                  {/* Alexander Rossi Card */}
                  <Animated type="scale" delay={0.2}>
                    <Card className="overflow-hidden border-2 border-red-200 shadow-xl bg-white/95 backdrop-blur">
                      <div className="flex flex-col h-full">
                        {/* Driver Image - Fixed container */}
                        <div className="relative h-64 overflow-hidden bg-gray-100">
                          {!imagesLoaded ? (
                            <Skeleton className="w-full h-full" />
                          ) : (
                            <img 
                              src="/lovable-uploads/dbec5171-816a-4d3d-a3b9-550d3166d0a9.png"
                              alt="Alexander Rossi - Driver #20"
                              className="w-full h-full object-contain bg-white"
                            />
                          )}
                          {/* Driver Number Overlay */}
                          <div className="absolute top-4 right-4 bg-red-500 text-white rounded-full w-12 h-12 flex items-center justify-center font-bold text-lg shadow-lg border-2 border-white">
                            20
                          </div>
                        </div>
                        
                        {/* Driver Info */}
                        <CardContent className="p-6 flex-1 bg-gradient-to-b from-white to-red-50/30">
                          <div className="space-y-4">
                            <div>
                              <h4 className="text-2xl font-bold text-black-primary">Alexander Rossi</h4>
                              <p className="text-red-500 font-semibold text-lg">#20 • IndyCar Series</p>
                            </div>
                            <p className="text-gray-700 leading-relaxed">
                              Indy 500 Champion, Alexander Rossi, is now behind the wheel of the No. 20 Chevrolet for the 
                              2025 season, and Juice Head is right there with him! Juice Head's logo is being prominently 
                              displayed on his helmet during the 2025 Season, reaching millions of viewers. With Rossi's 
                              success and IndyCar's massive audience, Juice Head gains a powerful platform to connect with 
                              clients and drive business growth.
                            </p>
                          </div>
                        </CardContent>
                      </div>
                    </Card>
                  </Animated>
                </div>
              </div>
            </div>
          </Animated>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
