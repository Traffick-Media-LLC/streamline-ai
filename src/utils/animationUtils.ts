
import { useEffect, useState, useRef, MutableRefObject } from 'react';

// Define the options for IntersectionObserver
interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
}

// Hook to detect when an element is in viewport
export const useInView = (
  options: UseInViewOptions = {}
): [MutableRefObject<HTMLDivElement | null>, boolean] => {
  const { threshold = 0.1, rootMargin = '0px', once = true } = options;
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  useEffect(() => {
    if (!ref.current) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setInView(isIntersecting);
        
        // If once is true and the element is visible, unobserve it
        if (isIntersecting && once && observerRef.current) {
          observerRef.current.unobserve(ref.current!);
        }
      },
      { threshold, rootMargin }
    );
    
    observerRef.current.observe(ref.current);
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold, rootMargin, once]);
  
  return [ref, inView];
};

// Animation classes based on various conditions
export const getAnimationClass = (
  inView: boolean,
  type: 'fade' | 'slide-up' | 'slide-in' | 'scale' = 'fade',
  delay: number = 0
): string => {
  // Base animation classes
  const baseClasses = 'transition-all duration-700';
  
  // Apply delay if specified
  const delayClass = delay ? `delay-${delay * 100}` : '';
  
  if (!inView) {
    // Initial (hidden) state
    switch (type) {
      case 'fade':
        return `${baseClasses} opacity-0`;
      case 'slide-up':
        return `${baseClasses} opacity-0 translate-y-8`;
      case 'slide-in':
        return `${baseClasses} opacity-0 -translate-x-8`;
      case 'scale':
        return `${baseClasses} opacity-0 scale-95`;
      default:
        return `${baseClasses} opacity-0`;
    }
  }
  
  // Visible state
  return `${baseClasses} ${delayClass} opacity-100 translate-y-0 translate-x-0 scale-100`;
};

// Animation wrapper component props type
export interface StaggeredChildrenProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  as?: React.ElementType;
}

// Utility function to calculate staggered delays for child elements
export const getStaggeredDelay = (index: number, baseDelay: number = 100) => {
  return (index * baseDelay) / 1000; // Convert to seconds for CSS
};
