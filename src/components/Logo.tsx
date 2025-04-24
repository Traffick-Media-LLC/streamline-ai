
import { useIsMobile } from "@/hooks/use-mobile";

const Logo = () => {
  const isMobile = useIsMobile();

  return (
    <div className="flex items-center gap-2">
      <img 
        alt="Streamline AI Logo" 
        className="h-12 md:h-10 w-auto object-contain transition-all duration-300"
        src={isMobile 
          ? "/lovable-uploads/670dd9f7-0787-4af7-9b4a-b6c776c52fd1.png"
          : "/lovable-uploads/b6506a91-7038-4932-bc42-c3c57842098d.png"
        }
      />
    </div>
  );
};

export default Logo;
