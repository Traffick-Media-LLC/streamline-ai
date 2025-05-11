
import { useEffect } from "react";

const PreloadHome: React.FC = () => {
  useEffect(() => {
    // Preload the homepage assets
    const preloadHomeAssets = async () => {
      try {
        // Preload critical images
        const imageUrls = [
          "/lovable-uploads/82b6b84f-934d-49af-88ae-b539479ec3a9.png", 
          "/lovable-uploads/84e0fd80-b14f-4f1d-9dd9-b248e7c6014e.png"
        ];
        
        imageUrls.forEach(url => {
          const img = new Image();
          img.src = url;
        });

        // Preload the homepage component
        await import('@/pages/HomePage');
      } catch (error) {
        console.error("Failed to preload assets:", error);
      }
    };

    // Start preloading after the auth page is loaded
    const timer = setTimeout(() => {
      preloadHomeAssets();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null;
};

export default PreloadHome;
