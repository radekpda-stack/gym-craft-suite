import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";

/**
 * Component that locks the app to portrait orientation on mobile devices.
 * Shows a full-screen overlay when the device is in landscape mode.
 */
export function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is a mobile phone (not tablet or desktop)
    const checkMobilePhone = () => {
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      // Use smaller threshold to exclude tablets - phones are typically < 768px on shortest side
      const shortestSide = Math.min(window.innerWidth, window.innerHeight);
      const isPhone = isTouchDevice && shortestSide <= 480;
      setIsMobile(isPhone);
    };

    // Check orientation
    const checkOrientation = () => {
      const isLandscapeMode = window.innerWidth > window.innerHeight;
      setIsLandscape(isLandscapeMode);
    };

    // Try to lock orientation using Screen Orientation API
    const lockOrientation = async () => {
      try {
        if (screen.orientation && 'lock' in screen.orientation) {
          await (screen.orientation as any).lock('portrait');
        }
      } catch (e) {
        // Orientation lock not supported or failed - we'll show the overlay instead
        console.log('Orientation lock not available, using overlay fallback');
      }
    };

    checkMobilePhone();
    checkOrientation();
    lockOrientation();

    // Listen for resize events to detect orientation changes
    const handleResize = () => {
      checkMobilePhone();
      checkOrientation();
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      
      // Unlock orientation when component unmounts
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          (screen.orientation as any).unlock();
        }
      } catch (e) {
        // Ignore unlock errors
      }
    };
  }, []);

  // Only show on mobile devices in landscape mode
  if (!isMobile || !isLandscape) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center p-8 text-center">
      {/* Rotating phone animation */}
      <div className="relative mb-8">
        <div className="w-32 h-20 border-4 border-primary rounded-2xl relative animate-pulse">
          {/* Phone screen */}
          <div className="absolute inset-2 bg-primary/20 rounded-lg" />
          {/* Phone notch */}
          <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary/40 rounded-full" />
        </div>
        
        {/* Rotation arrow */}
        <RotateCcw className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-8 h-8 text-primary animate-spin" style={{ animationDuration: '3s' }} />
      </div>

      <h2 className="text-xl font-bold text-foreground mb-3">
        Otoč telefon
      </h2>
      
      <p className="text-muted-foreground text-sm max-w-xs">
        Pro nejlepší zážitek prosím otoč telefon do svislé polohy
      </p>

      {/* Visual hint */}
      <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
        <div className="w-10 h-6 border-2 border-current rounded-md opacity-50" />
        <span>→</span>
        <div className="w-6 h-10 border-2 border-primary rounded-md" />
      </div>
    </div>
  );
}
