
import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Set initial value using window.innerWidth if available (client-side)
    if (typeof window !== 'undefined') {
      return window.innerWidth < MOBILE_BREAKPOINT;
    }
    // Default to false for server-side rendering
    return false;
  });

  React.useEffect(() => {
    // Early return if window is not available (SSR)
    if (typeof window === 'undefined') return;
    
    // Function to handle resize event
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    // Add event listener with debounce
    let timeoutId: number | null = null;
    const debouncedResize = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(handleResize, 100);
    };
    
    window.addEventListener('resize', debouncedResize);
    
    // Initial check on mount
    handleResize();
    
    // Cleanup event listener on component unmount
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, []);

  return isMobile;
}
