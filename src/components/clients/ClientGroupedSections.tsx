/**
 * ClientGroupedSections Component
 * 
 * Displays client sections organized into 5 thematic groups:
 * - Výkon (Performance): PRs, Analytics, Feedback
 * - Komunikace (Communication): Chat, Notes
 * - Zdraví (Health): Diagnostics, Pain map, Injury history
 * - Tělo (Body): Measurements, Nutrition, Media
 * - Historie (History): Timeline
 * 
 * Groups are automatically sorted by usage frequency.
 */
import { ReactNode, useCallback, useMemo } from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { 
  Trophy, 
  MessageSquare, 
  Heart, 
  User,
  Clock,
  Star,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSectionUsage, useTrackSectionOpen, getSortedGroups, getMostUsedGroup } from '@/hooks/useSectionUsage';

// Group definitions
export interface SectionGroup {
  id: string;
  icon: ReactNode;
  title: string;
  sections: GroupSection[];
}

export interface GroupSection {
  id: string;
  title: string;
  badge?: string | number;
  children: ReactNode;
}

interface ClientGroupedSectionsProps {
  clientId: string;
  groups: SectionGroup[];
  defaultOpenGroups?: string[];
}

// Group icon mapping
const GROUP_ICONS: Record<string, ReactNode> = {
  performance: <Trophy className="w-5 h-5" />,
  communication: <MessageSquare className="w-5 h-5" />,
  health: <Heart className="w-5 h-5" />,
  body: <User className="w-5 h-5" />,
  history: <Clock className="w-5 h-5" />,
};

// Group titles in Czech
const GROUP_TITLES: Record<string, string> = {
  performance: 'Výkon',
  communication: 'Komunikace',
  health: 'Zdraví',
  body: 'Tělo',
  history: 'Historie',
};

export function ClientGroupedSections({
  clientId,
  groups,
  defaultOpenGroups = ['performance'],
}: ClientGroupedSectionsProps) {
  const { data: usageData = [] } = useSectionUsage(clientId);
  const trackSection = useTrackSectionOpen();
  
  // Get sorted group order based on usage
  const sortedGroupIds = useMemo(() => getSortedGroups(usageData), [usageData]);
  const mostUsedGroup = useMemo(() => getMostUsedGroup(usageData), [usageData]);

  // Sort groups according to usage
  const sortedGroups = useMemo(() => {
    const groupMap = new Map(groups.map(g => [g.id, g]));
    return sortedGroupIds
      .map(id => groupMap.get(id))
      .filter((g): g is SectionGroup => !!g);
  }, [groups, sortedGroupIds]);

  // Track when accordion opens
  const handleAccordionChange = useCallback((value: string[]) => {
    // Track all newly opened sections
    for (const sectionId of value) {
      // Find which group this section belongs to and track it
      for (const group of groups) {
        const section = group.sections.find(s => s.id === sectionId);
        if (section) {
          trackSection.mutate({ clientId, sectionId });
          break;
        }
      }
    }
  }, [clientId, groups, trackSection]);

  // Calculate total badge count for group
  const getGroupBadgeCount = (group: SectionGroup): number => {
    return group.sections.reduce((sum, s) => {
      if (typeof s.badge === 'number') return sum + s.badge;
      if (typeof s.badge === 'string' && !isNaN(Number(s.badge))) return sum + Number(s.badge);
      return sum;
    }, 0);
  };

  return (
    <div className="space-y-3">
      {sortedGroups.map((group) => {
        const badgeCount = getGroupBadgeCount(group);
        const isMostUsed = group.id === mostUsedGroup;
        
        return (
          <Collapsible
            key={group.id}
            defaultOpen={defaultOpenGroups.includes(group.id)}
            className="glass rounded-xl overflow-hidden"
          >
            <CollapsibleTrigger className="w-full px-4 py-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-primary">
                  {GROUP_ICONS[group.id] || group.icon}
                </span>
                <span className="font-semibold text-foreground">
                  {GROUP_TITLES[group.id] || group.title}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({group.sections.length})
                </span>
                {badgeCount > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {badgeCount}
                  </span>
                )}
                {isMostUsed && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <Accordion 
                type="multiple" 
                className="px-2 pb-2"
                onValueChange={handleAccordionChange}
              >
                {group.sections.map((section) => (
                  <AccordionItem 
                    key={section.id} 
                    value={section.id}
                    className="border-0 bg-background/50 rounded-lg mb-1 last:mb-0"
                  >
                    <AccordionTrigger className="px-3 py-2 text-sm hover:no-underline hover:bg-secondary/20 rounded-lg transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground/90">{section.title}</span>
                        {section.badge !== undefined && section.badge !== null && section.badge !== 0 && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                            {section.badge}
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3 pt-1">
                      {section.children}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </div>
  );
}
