import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';

export function AppRefreshSettings() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isClearingCache, setIsClearingCache] = useState(false);

  // Clear caches and service worker
  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      // Clear React Query cache
      queryClient.clear();

      // Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // Clear Cache Storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }

      toast.success(language === 'cs' ? 'Cache vyčištěna, stránka se obnoví...' : 'Cache cleared, page will reload...');
      
      // Small delay to show toast
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      setIsClearingCache(false);
      toast.error(language === 'cs' ? 'Chyba při čištění cache' : 'Error clearing cache');
    }
  };

  return (
    <div className="space-y-4">
      {/* Clear Cache Button */}
      <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30">
        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500 shrink-0">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">
            {language === 'cs' ? 'Vyčistit cache' : 'Clear Cache'}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === 'cs' 
              ? 'Vymaže cache a Service Worker. Použijte po aktualizaci aplikace nebo když máte problémy s načítáním dat.'
              : 'Clears cache and Service Worker. Use after app update or when having data loading issues.'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={handleClearCache}
            disabled={isClearingCache}
          >
            {isClearingCache ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'cs' ? 'Mažu cache...' : 'Clearing cache...'}
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2" />
                {language === 'cs' ? 'Vyčistit cache a obnovit' : 'Clear Cache & Refresh'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
