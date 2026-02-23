import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, ExternalLink } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function PublicStatsSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [slug, setSlug] = useState('');
  const [enabled, setEnabled] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile-public-stats', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('public_stats_enabled, public_stats_slug')
        .eq('id', user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (profile) {
      setEnabled(profile.public_stats_enabled ?? false);
      setSlug(profile.public_stats_slug ?? '');
    }
  }, [profile]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-');
      
      if (enabled && !cleanSlug) {
        throw new Error('Zadejte URL slug');
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          public_stats_enabled: enabled,
          public_stats_slug: enabled ? cleanSlug : null,
        } as any)
        .eq('id', user!.id);

      if (error) {
        if (error.code === '23505') throw new Error('Tento slug je již obsazený');
        throw error;
      }

      setSlug(cleanSlug);
    },
    onSuccess: () => {
      toast.success('Nastavení vizitky uloženo');
      queryClient.invalidateQueries({ queryKey: ['profile-public-stats'] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const publicUrl = `${window.location.origin}/trener/${slug}`;

  const copyUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    toast.success('Odkaz zkopírován');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Aktivovat veřejnou vizitku</p>
          <p className="text-xs text-muted-foreground">Sdílejte své statistiky jako trenér</p>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {enabled && (
        <>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-widest">URL slug</label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="moje-jmeno"
              className="mt-1"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Pouze malá písmena, čísla a pomlčky
            </p>
          </div>

          {slug && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-background/50 border border-border/50">
              <p className="text-xs text-muted-foreground flex-1 truncate">{publicUrl}</p>
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" onClick={copyUrl}>
                <Copy className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => window.open(publicUrl, '_blank')}
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </>
      )}

      <Button
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending}
        className="w-full"
      >
        {saveMutation.isPending ? 'Ukládám...' : 'Uložit nastavení'}
      </Button>
    </div>
  );
}
