import { ReactNode, useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { CommandPalette, useCommandPalette } from '@/components/search/CommandPalette';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
import { useAppShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Keyboard shortcuts
  useAppShortcuts({
    onSearch: () => setCommandOpen(true),
  });

  // ? shortcut for help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault();
          setShowShortcutsHelp(prev => !prev);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

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
      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

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
        {/* Top bar with search trigger */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/50 px-4 md:px-8 py-3 hidden md:flex items-center justify-between">
          <Button
            variant="outline"
            className="w-64 justify-start gap-2 text-muted-foreground glass-subtle border-0"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="w-4 h-4" />
            <span>Hledat...</span>
            <kbd className="ml-auto px-1.5 py-0.5 bg-secondary rounded text-[10px]">⌘K</kbd>
          </Button>
          <KeyboardShortcutsHelp />
        </div>
        
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation - hidden on desktop */}
      <MobileNav />
    </div>
  );
}

