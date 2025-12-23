import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Trash2, RotateCcw, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/lib/i18n';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export function AppRefreshSettings() {
  const { language } = useLanguage();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [isHardResetting, setIsHardResetting] = useState(false);

  // Soft refresh - just invalidate React Query cache
  const handleRefreshData = async () => {
    setIsRefreshing(true);
    try {
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries();
      toast.success(language === 'cs' ? 'Data úspěšně obnovena' : 'Data refreshed successfully');
    } catch (error) {
      toast.error(language === 'cs' ? 'Chyba při obnovování dat' : 'Error refreshing data');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Medium refresh - clear caches and service worker
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

  // Hard reset - clear everything including localStorage
  const handleHardReset = async () => {
    setIsHardResetting(true);
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

      // Clear localStorage (preserve auth tokens)
      const authKeys = ['sb-zukmwqfqmfuyqpxfjqil-auth-token'];
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !authKeys.some(authKey => key.includes(authKey))) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => localStorage.removeItem(key));

      toast.success(language === 'cs' ? 'Kompletní reset proveden, stránka se obnoví...' : 'Hard reset complete, page will reload...');
      
      // Small delay to show toast
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      setIsHardResetting(false);
      toast.error(language === 'cs' ? 'Chyba při resetu' : 'Error during reset');
    }
  };

  return (
    <div className="space-y-4">
      {/* Refresh Data Button */}
      <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500 shrink-0">
          <RefreshCw className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">
            {language === 'cs' ? 'Obnovit data' : 'Refresh Data'}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === 'cs' 
              ? 'Znovu načte všechna data z databáze. Použijte, když chybí nová data.'
              : 'Reloads all data from database. Use when new data is missing.'}
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={handleRefreshData}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {language === 'cs' ? 'Obnovuji...' : 'Refreshing...'}
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                {language === 'cs' ? 'Obnovit data' : 'Refresh Data'}
              </>
            )}
          </Button>
        </div>
      </div>

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
              ? 'Vymaže cache a Service Worker. Použijte po aktualizaci aplikace z Lovable.'
              : 'Clears cache and Service Worker. Use after app update from Lovable.'}
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
                {language === 'cs' ? 'Vyčistit cache' : 'Clear Cache'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Hard Reset Button */}
      <div className="flex items-start gap-4 p-4 rounded-lg bg-secondary/30 border border-destructive/20">
        <div className="p-2 rounded-lg bg-destructive/10 text-destructive shrink-0">
          <RotateCcw className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-foreground">
            {language === 'cs' ? 'Tvrdý reset' : 'Hard Reset'}
          </h4>
          <p className="text-sm text-muted-foreground mt-0.5">
            {language === 'cs' 
              ? 'Vymaže vše včetně lokálních preferencí. Přihlášení zůstane zachováno.'
              : 'Clears everything including local preferences. Login will be preserved.'}
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 border-destructive/50 text-destructive hover:bg-destructive/10"
                disabled={isHardResetting}
              >
                {isHardResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {language === 'cs' ? 'Resetuji...' : 'Resetting...'}
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {language === 'cs' ? 'Tvrdý reset' : 'Hard Reset'}
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {language === 'cs' ? 'Potvrdit tvrdý reset' : 'Confirm Hard Reset'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {language === 'cs' 
                    ? 'Tato akce vymaže všechna lokální data a preference. Přihlášení zůstane zachováno, ale budete muset znovu nastavit lokální preference (např. jazyk, zobrazení).'
                    : 'This action will clear all local data and preferences. Login will be preserved, but you will need to reconfigure local preferences (e.g., language, display settings).'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {language === 'cs' ? 'Zrušit' : 'Cancel'}
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={handleHardReset}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {language === 'cs' ? 'Provést reset' : 'Perform Reset'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
