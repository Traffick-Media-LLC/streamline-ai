
import { useIsMobile } from "@/hooks/use-mobile";

const Logo = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className="flex items-center gap-2">
      <img 
        alt="Streamline AI Logo" 
        className={`${isMobile ? 'h-8 max-w-full object-contain' : 'h-8'} transition-all duration-300`} 
        src="/lovable-uploads/b6506a91-7038-4932-bc42-c3c57842098d.png" 
      />
    </div>
  );
};

export default Logo;
