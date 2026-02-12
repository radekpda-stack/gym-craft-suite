import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RefreshButtonProps {
  queryKeys?: string[][];
  className?: string;
}

export function RefreshButton({ queryKeys, className }: RefreshButtonProps) {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (queryKeys && queryKeys.length > 0) {
        await Promise.all(
          queryKeys.map(key => queryClient.invalidateQueries({ queryKey: key }))
        );
      } else {
        await queryClient.invalidateQueries();
      }
      toast.success('Data aktualizována');
    } finally {
      setTimeout(() => setIsRefreshing(false), 600);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      className={cn("h-9 w-9", className)}
      title="Obnovit data"
    >
      <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
    </Button>
  );
}
