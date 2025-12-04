import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Listen for sidebar state changes
  useEffect(() => {
    const checkSidebarWidth = () => {
      const sidebar = document.querySelector('aside');
      if (sidebar) {
        setSidebarCollapsed(sidebar.classList.contains('w-20'));
      }
    };

    const observer = new MutationObserver(checkSidebarWidth);
    const sidebar = document.querySelector('aside');
    
    if (sidebar) {
      observer.observe(sidebar, { attributes: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>
      
      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          'md:ml-64', // Desktop: margin for sidebar
          sidebarCollapsed && 'md:ml-20',
          'pb-20 md:pb-0' // Mobile: padding for bottom nav
        )}
      >
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation - hidden on desktop */}
      <MobileNav />
    </div>
  );
}

