import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tags, Hash } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

export function ClientTagsCard() {
  const { data, isLoading } = useQuery({
    queryKey: ['client-tags-distribution'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch all client tags with tag details
      const { data: clientTags, error: tagsError } = await supabase
        .from('client_tags')
        .select(`
          id,
          tag_id,
          tags (
            id,
            name,
            color,
            type
          )
        `);

      if (tagsError) throw tagsError;

      // Count tags
      const tagCounts: Record<string, { name: string; color: string; type: string; count: number }> = {};
      
      (clientTags || []).forEach((ct: any) => {
        if (ct.tags) {
          const tagId = ct.tags.id;
          if (!tagCounts[tagId]) {
            tagCounts[tagId] = {
              name: ct.tags.name,
              color: ct.tags.color || '#6366f1',
              type: ct.tags.type || 'general',
              count: 0,
            };
          }
          tagCounts[tagId].count += 1;
        }
      });

      const sortedTags = Object.values(tagCounts)
        .sort((a, b) => b.count - a.count);

      return {
        tags: sortedTags,
        totalTags: sortedTags.length,
        totalAssignments: clientTags?.length || 0,
      };
    },
  });

  if (isLoading) {
    return <Skeleton className="h-48 rounded-xl" />;
  }

  if (!data || data.totalTags === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Tags className="h-4 w-4 text-muted-foreground" />
            Štítky klientů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            Zatím žádné štítky
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Tags className="h-4 w-4 text-primary" />
          Štítky klientů
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex items-center justify-between text-sm pb-2 border-b">
          <span className="text-muted-foreground">Celkem štítků</span>
          <span className="font-semibold">{data.totalTags}</span>
        </div>

        {/* Top tags */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Nejpoužívanější</p>
          <div className="flex flex-wrap gap-2">
            {data.tags.slice(0, 8).map((tag) => (
              <Badge 
                key={tag.name}
                variant="secondary"
                className="gap-1"
                style={{ 
                  backgroundColor: `${tag.color}20`,
                  borderColor: tag.color,
                  color: tag.color,
                }}
              >
                <Hash className="h-3 w-3" />
                {tag.name}
                <span className="ml-1 opacity-70">{tag.count}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Usage stats */}
        <div className="text-xs text-muted-foreground text-center pt-2">
          {data.totalAssignments} přiřazení celkem
        </div>
      </CardContent>
    </Card>
  );
}
