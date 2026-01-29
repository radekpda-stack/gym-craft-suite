import { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronRight, ChevronDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useTags } from '@/hooks/useTags';

// Hierarchická struktura kategorií
interface BodyPartCategory {
  key: string;
  name: string;
  hasChildren: boolean;
  childTagNames?: string[];
}

const BODY_PART_CATEGORIES: BodyPartCategory[] = [
  { 
    key: 'full', 
    name: 'Celé tělo', 
    hasChildren: false 
  },
  { 
    key: 'upper', 
    name: 'Horní část', 
    hasChildren: true,
    childTagNames: ['Ramena', 'Biceps', 'Triceps', 'Hrudník', 'Záda', 'Trapézy']
  },
  { 
    key: 'lower', 
    name: 'Dolní část', 
    hasChildren: true,
    childTagNames: ['Přední stehna', 'Zadní stehna', 'Hýždě', 'Lýtka', 'Kyčle']
  },
  { 
    key: 'core', 
    name: 'Břicho', 
    hasChildren: true,
    childTagNames: ['Přímé břišní', 'Šikmé břišní', 'Hluboké břišní', 'Bederní']
  },
];

interface BodyPartDropdownSelectProps {
  bodyPartTagIds: string[];
  onBodyPartTagsChange: (ids: string[]) => void;
  className?: string;
}

export function BodyPartDropdownSelect({
  bodyPartTagIds,
  onBodyPartTagsChange,
  className,
}: BodyPartDropdownSelectProps) {
  const { data: tags = [] } = useTags();
  const [open, setOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  // Mapovat tagy podle jména pro rychlý lookup
  const tagsByName = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    tags
      .filter((t) => t.tag_type === 'body_part')
      .forEach((t) => map.set(t.name, { id: t.id, name: t.name }));
    return map;
  }, [tags]);

  // Získat ID hlavní kategorie z názvu
  const getCategoryTagId = (categoryName: string) => {
    return tagsByName.get(categoryName)?.id;
  };

  // Zjistit, zda je kategorie (nebo nějaký její child) vybraná
  const isCategorySelected = (category: BodyPartCategory) => {
    const categoryId = getCategoryTagId(category.name);
    if (categoryId && bodyPartTagIds.includes(categoryId)) return true;
    
    if (category.hasChildren && category.childTagNames) {
      return category.childTagNames.some((childName) => {
        const childId = tagsByName.get(childName)?.id;
        return childId && bodyPartTagIds.includes(childId);
      });
    }
    return false;
  };

  // Toggle hlavní kategorie
  const toggleCategory = (category: BodyPartCategory) => {
    const categoryId = getCategoryTagId(category.name);
    if (!categoryId) return;

    if (bodyPartTagIds.includes(categoryId)) {
      // Odstranit kategorii a všechny její children
      const childIds = category.childTagNames
        ?.map((name) => tagsByName.get(name)?.id)
        .filter(Boolean) as string[] || [];
      
      onBodyPartTagsChange(
        bodyPartTagIds.filter((id) => id !== categoryId && !childIds.includes(id))
      );
    } else {
      // Přidat kategorii
      onBodyPartTagsChange([...bodyPartTagIds, categoryId]);
    }
  };

  // Toggle konkrétní sval
  const toggleChild = (childName: string) => {
    const childId = tagsByName.get(childName)?.id;
    if (!childId) return;

    if (bodyPartTagIds.includes(childId)) {
      onBodyPartTagsChange(bodyPartTagIds.filter((id) => id !== childId));
    } else {
      onBodyPartTagsChange([...bodyPartTagIds, childId]);
    }
  };

  // Získat display text pro trigger
  const getDisplayText = () => {
    if (bodyPartTagIds.length === 0) return null;
    
    // Najít první vybraný tag
    const firstTag = tags.find((t) => t.id === bodyPartTagIds[0]);
    return firstTag?.name || 'Vybráno';
  };

  const displayText = getDisplayText();
  const additionalCount = bodyPartTagIds.length > 1 ? bodyPartTagIds.length - 1 : 0;

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        Partie
      </span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-9 w-full items-center justify-between rounded-xl border border-border bg-secondary/50 px-4 py-2 text-sm',
              'ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary',
              'transition-all duration-200',
              bodyPartTagIds.length > 0 && 'border-primary/30 bg-primary/5'
            )}
          >
            <span className={cn('truncate', !displayText && 'text-muted-foreground')}>
              {displayText || 'Partie...'}
            </span>
            <div className="flex items-center gap-1">
              {additionalCount > 0 && (
                <Badge 
                  variant="secondary" 
                  className="h-5 min-w-[20px] px-1.5 text-[10px] bg-primary text-primary-foreground"
                >
                  +{additionalCount}
                </Badge>
              )}
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0 bg-popover border-border" align="start">
          <div className="max-h-80 overflow-y-auto">
            {BODY_PART_CATEGORIES.map((category) => {
              const categoryId = getCategoryTagId(category.name);
              const isSelected = categoryId && bodyPartTagIds.includes(categoryId);
              const hasSelectedChildren = category.hasChildren && category.childTagNames?.some((childName) => {
                const childId = tagsByName.get(childName)?.id;
                return childId && bodyPartTagIds.includes(childId);
              });
              const isExpanded = expandedCategory === category.key;

              return (
                <div key={category.key} className="border-b border-border/50 last:border-b-0">
                  {/* Hlavní kategorie */}
                  <div
                    className={cn(
                      'flex items-center justify-between p-3 hover:bg-muted/50 cursor-pointer transition-colors',
                      (isSelected || hasSelectedChildren) && 'bg-primary/5'
                    )}
                    onClick={() => {
                      if (category.hasChildren) {
                        setExpandedCategory(isExpanded ? null : category.key);
                      } else {
                        toggleCategory(category);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {(isSelected || hasSelectedChildren) && (
                        <Check className="h-4 w-4 text-primary shrink-0" />
                      )}
                      <span className={cn(
                        'text-sm font-medium',
                        (isSelected || hasSelectedChildren) && 'text-primary'
                      )}>
                        {category.name}
                      </span>
                    </div>
                    {category.hasChildren && (
                      <ChevronRight 
                        className={cn(
                          'h-4 w-4 text-muted-foreground transition-transform duration-200',
                          isExpanded && 'rotate-90'
                        )} 
                      />
                    )}
                  </div>

                  {/* Podkategorie (children) */}
                  {category.hasChildren && isExpanded && (
                    <div className="bg-muted/30 border-t border-border/30">
                      {/* Volba hlavní kategorie */}
                      <div
                        className={cn(
                          'flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors',
                          isSelected && 'bg-primary/10'
                        )}
                        onClick={() => toggleCategory(category)}
                      >
                        <Checkbox 
                          checked={!!isSelected} 
                          className="pointer-events-none"
                        />
                        <span className="text-sm text-muted-foreground italic">
                          Celá {category.name.toLowerCase()}
                        </span>
                      </div>

                      {/* Jednotlivé svaly */}
                      {category.childTagNames?.map((childName) => {
                        const childTag = tagsByName.get(childName);
                        if (!childTag) return null;
                        
                        const isChildSelected = bodyPartTagIds.includes(childTag.id);

                        return (
                          <div
                            key={childTag.id}
                            className={cn(
                              'flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors',
                              isChildSelected && 'bg-primary/10'
                            )}
                            onClick={() => toggleChild(childName)}
                          >
                            <Checkbox 
                              checked={isChildSelected}
                              className="pointer-events-none"
                            />
                            <span className={cn(
                              'text-sm',
                              isChildSelected && 'text-primary font-medium'
                            )}>
                              {childName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Clear button */}
          {bodyPartTagIds.length > 0 && (
            <div className="border-t border-border p-2">
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-1.5"
                onClick={() => {
                  onBodyPartTagsChange([]);
                  setOpen(false);
                }}
              >
                — Zrušit výběr —
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}
