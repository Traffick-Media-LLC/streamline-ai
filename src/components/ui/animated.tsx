
import React, { Children, cloneElement, isValidElement } from "react";
import { useInView, getAnimationClass, StaggeredChildrenProps } from "@/utils/animationUtils";
import { cn } from "@/lib/utils";

interface AnimatedProps {
  children: React.ReactNode;
  type?: 'fade' | 'slide-up' | 'slide-in' | 'scale';
  delay?: number;
  threshold?: number;
  className?: string;
  once?: boolean;
  as?: React.ElementType;
}

export const Animated = ({
  children,
  type = 'fade',
  delay = 0,
  threshold = 0.1,
  className = "",
  once = true,
  as: Component = "div",
}: AnimatedProps) => {
  const [ref, inView] = useInView({ threshold, once });
  
  return (
    <Component
      ref={ref}
      className={cn(getAnimationClass(inView, type, delay), className)}
    >
      {children}
    </Component>
  );
};

export const AnimatedList = ({
  children,
  className = "",
  staggerDelay = 0.1,
  as: Component = "div"
}: StaggeredChildrenProps) => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  
  return (
    <Component ref={ref} className={className}>
      {Children.map(children, (child, index) => {
        if (isValidElement(child)) {
          return cloneElement(child, {
            className: cn(
              child.props.className,
              getAnimationClass(inView, 'fade', index * staggerDelay)
            ),
          });
        }
        return child;
      })}
    </Component>
  );
};

// For images specifically, with optimized loading
export const AnimatedImage = ({
  src,
  alt,
  className = "",
  width,
  height,
  type = 'fade',
}: {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
  type?: 'fade' | 'scale';
}) => {
  const [ref, inView] = useInView({ threshold: 0.1 });
  
  return (
    <div
      ref={ref}
      className={cn("overflow-hidden", className)}
    >
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className={cn(
          "w-full h-auto",
          getAnimationClass(inView, type)
        )}
      />
    </div>
  );
};

// Skeleton component that transitions to content when loaded
export const AnimatedTransition = ({
  isLoading,
  children,
  fallback,
  className = "",
}: {
  isLoading: boolean;
  children: React.ReactNode;
  fallback: React.ReactNode;
  className?: string;
}) => {
  return (
    <div className={cn("relative", className)}>
      <div className={cn(
        "transition-all duration-500",
        isLoading ? "opacity-100 scale-100" : "opacity-0 scale-95 absolute inset-0"
      )}>
        {fallback}
      </div>
      <div className={cn(
        "transition-all duration-500",
        isLoading ? "opacity-0 scale-105 absolute inset-0" : "opacity-100 scale-100"
      )}>
        {children}
      </div>
    </div>
  );
};
