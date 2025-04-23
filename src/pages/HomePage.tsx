
import { useState } from "react";
import USAMap from "@/components/USAMap";
import StateDetails from "@/components/StateDetails";
import ProductFilter from "@/components/ProductFilter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, MapPin } from "lucide-react";
import Logo from "@/components/Logo";

// Product categories
export type ProductCategory = "nicotine" | "hemp" | "kratom" | "all";

const HomePage = () => {
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const handleStateClick = (stateCode: string) => {
    setSelectedState(stateCode);
  };

  const handleCategoryChange = (category: ProductCategory) => {
    setSelectedCategory(category);
  };

  const handleStateSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Find state by name and set as selected
    if (searchQuery.trim()) {
      // For now, this is just a placeholder
      console.log("Searching for:", searchQuery);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header/Navigation */}
      <header className="border-b bg-white shadow-sm">
        <div className="container flex items-center justify-between py-4">
          <Logo />
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="hidden md:flex" onClick={() => window.location.href = "/knowledge"}>
              Knowledge Base
            </Button>
            <Button variant="ghost" className="hidden md:flex" onClick={() => window.location.href = "/profile"}>
              Profile
            </Button>
            <Button variant="ghost" className="hidden md:flex" onClick={() => window.location.href = "/chat"}>
              Chat Assistant
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <h1 className="text-4xl font-bold mb-2 text-streamline-red">Regulatory Map</h1>
        <p className="text-lg text-streamline-darkGray mb-6">
          View product availability and regulations across the United States
        </p>

        {/* Controls Row */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Search */}
          <div className="flex-1">
            <form onSubmit={handleStateSearch} className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search states..."
                className="flex-1"
              />
              <Button type="submit" variant="outline" size="icon">
                <Search className="h-4 w-4" />
              </Button>
            </form>
          </div>

          {/* Product Category Filter */}
          <ProductFilter selectedCategory={selectedCategory} onCategoryChange={handleCategoryChange} />
        </div>

        {/* Map and Details Container */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Map Container */}
          <div className="flex-1">
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <USAMap 
                  onStateClick={handleStateClick} 
                  selectedState={selectedState} 
                  productCategory={selectedCategory} 
                />
              </CardContent>
            </Card>
          </div>

          {/* State Details */}
          <div className="w-full lg:w-1/3">
            {selectedState ? (
              <StateDetails 
                stateCode={selectedState} 
                productCategory={selectedCategory} 
              />
            ) : (
              <Card className="h-full">
                <CardContent className="p-6 flex flex-col items-center justify-center text-center h-full">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No State Selected</h3>
                  <p className="text-muted-foreground mt-2">
                    Click on a state in the map to view product availability and regulations
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
            <span className="text-sm">Available</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-yellow-500 rounded-full mr-2"></div>
            <span className="text-sm">Restricted</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
            <span className="text-sm">Prohibited</span>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded-full mr-2"></div>
            <span className="text-sm">No Data</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
