import { useEffect, useState } from 'react';
import { cn } from './utils';

interface AudioVisualizerProps {
  isActive: boolean;
  className?: string;
}

export function AudioVisualizer({ isActive, className }: AudioVisualizerProps) {
  const [bars, setBars] = useState<number[]>(new Array(20).fill(0));

  useEffect(() => {
    if (!isActive) {
      setBars(new Array(20).fill(0));
      return;
    }

    const interval = setInterval(() => {
      setBars(prev => 
        prev.map(() => Math.random() * 100)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className={cn("flex items-center justify-center gap-1 h-8", className)}>
      {bars.map((height, index) => (
        <div
          key={index}
          className={cn(
            "bg-gradient-to-t from-green-400 to-green-600 rounded-full transition-all duration-100 w-1",
            isActive ? "opacity-100" : "opacity-30"
          )}
          style={{
            height: `${Math.max(4, height * 0.3)}px`,
            animationDelay: `${index * 50}ms`
          }}
        />
      ))}
    </div>
  );
}