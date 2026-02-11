import { ReactNode, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PageTransition } from './PageTransition';

import { CommandPalette, useCommandPalette } from '@/components/search/CommandPalette';
import { KeyboardShortcutsHelp } from '@/components/ui/keyboard-shortcuts-help';
// ReminderNotifier removed
import { useClientAnniversaryNotifier } from '@/hooks/useClientAnniversaries';
import { useClientBirthdayNotifier } from '@/hooks/useClientBirthdayNotifier';
import { useAppShortcuts } from '@/hooks/useKeyboardShortcuts';
import { cn } from '@/lib/utils';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { open: commandOpen, setOpen: setCommandOpen } = useCommandPalette();
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // Anniversary notifier - checks for client anniversaries
  useClientAnniversaryNotifier();

  // Birthday notifier - checks for client birthdays
  useClientBirthdayNotifier();
  // Keyboard shortcuts
  useAppShortcuts({
    onSearch: () => setCommandOpen(true),
  });

  // Callback for sidebar state changes - passed to Sidebar component
  const handleSidebarCollapse = useCallback((collapsed: boolean) => {
    setSidebarCollapsed(collapsed);
  }, []);

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

  return (
    <div className="min-h-screen bg-background">
      {/* Reminder Notifier removed */}

      {/* Command Palette */}
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />

      {/* Desktop Sidebar - hidden on mobile and tablet */}
      <div className="hidden lg:block">
        <Sidebar onCollapseChange={handleSidebarCollapse} />
      </div>
      
      {/* Main Content */}
      <main
        className={cn(
          'min-h-screen transition-all duration-300 ease-in-out',
          'lg:ml-56', // Desktop: margin for sidebar (lg and up)
          sidebarCollapsed && 'lg:ml-16',
          'pb-36 lg:pb-0' // Mobile/Tablet: padding for floating bottom nav
        )}
      >
        {/* Top bar with search trigger - Desktop only */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 lg:px-8 py-3 hidden lg:flex items-center justify-between">
          <Button
            variant="outline"
            className="w-64 justify-start gap-2 text-muted-foreground"
            onClick={() => setCommandOpen(true)}
          >
            <Search className="w-4 h-4" />
            <span>Hledat...</span>
            <kbd className="ml-auto px-1.5 py-0.5 bg-secondary rounded text-[10px] font-mono">⌘K</kbd>
          </Button>
          <KeyboardShortcutsHelp />
        </div>
        
        {/* Content area - optimized padding for all devices */}
        <PageTransition key={location.pathname}>
          {children}
        </PageTransition>
      </main>


      {/* Mobile Navigation - hidden on desktop */}
      <MobileNav />
    </div>
  );
}
