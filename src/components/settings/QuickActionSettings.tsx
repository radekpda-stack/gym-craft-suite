import { useMemo } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  UserPlus,
  Dumbbell,
  Activity,
  Stethoscope,
  Wallet,
  ShoppingBag,
  RotateCcw,
  LucideIcon,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { cn } from '@/lib/utils';

interface QuickActionItem {
  id: string;
  icon: LucideIcon;
  label: string;
  color: string;
}

const quickActionsConfig: QuickActionItem[] = [
  { id: 'client', icon: UserPlus, label: 'Nový klient', color: 'bg-blue-500' },
  { id: 'training', icon: Dumbbell, label: 'Nový trénink', color: 'bg-primary' },
  { id: 'measurement', icon: Activity, label: 'Nové měření', color: 'bg-green-500' },
  { id: 'diagnostic', icon: Stethoscope, label: 'Nová diagnostika', color: 'bg-purple-500' },
  { id: 'credit', icon: Wallet, label: 'Dobít kredit', color: 'bg-amber-500' },
  { id: 'sale', icon: ShoppingBag, label: 'Nový prodej', color: 'bg-pink-500' },
];

interface SortableItemProps {
  item: QuickActionItem;
  isVisible: boolean;
  onToggle: () => void;
  canHide: boolean;
}

function SortableItem({ item, isVisible, onToggle, canHide }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-3 p-3 rounded-xl glass-subtle transition-all',
        isDragging && 'opacity-50 shadow-lg',
        !isVisible && 'opacity-60'
      )}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', item.color)}>
        <item.icon className="w-4 h-4 text-white" />
      </div>
      
      <span className={cn('flex-1 font-medium', !isVisible && 'text-muted-foreground')}>
        {item.label}
      </span>
      
      <Switch
        checked={isVisible}
        onCheckedChange={onToggle}
        disabled={isVisible && !canHide}
      />
    </div>
  );
}

export function QuickActionSettings() {
  const { 
    preferences, 
    updateQuickActionOrder, 
    toggleQuickActionVisibility,
    resetToDefaults 
  } = useLayoutPreferences();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const orderedActions = useMemo(() => {
    return preferences.quickActionOrder
      .map(id => quickActionsConfig.find(a => a.id === id))
      .filter((a): a is QuickActionItem => a !== undefined);
  }, [preferences.quickActionOrder]);

  const visibleCount = preferences.quickActionOrder.filter(
    id => !preferences.hiddenQuickActions.includes(id)
  ).length;

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = preferences.quickActionOrder.indexOf(active.id as string);
      const newIndex = preferences.quickActionOrder.indexOf(over.id as string);
      const newOrder = arrayMove(preferences.quickActionOrder, oldIndex, newIndex);
      updateQuickActionOrder(newOrder);
    }
  };

  const handleReset = () => {
    resetToDefaults();
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={orderedActions.map(a => a.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {orderedActions.map(action => (
              <SortableItem
                key={action.id}
                item={action}
                isVisible={!preferences.hiddenQuickActions.includes(action.id)}
                onToggle={() => toggleQuickActionVisibility(action.id)}
                canHide={visibleCount > 1}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="pt-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Obnovit výchozí
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Přetažením změníte pořadí, přepínačem skryjete položky. Minimálně jedna položka musí zůstat viditelná.
      </p>
    </div>
  );
}
