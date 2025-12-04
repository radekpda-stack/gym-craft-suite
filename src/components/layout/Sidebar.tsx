import { useState, useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
  LayoutDashboard,
  Users,
  Dumbbell,
  Library,
  Stethoscope,
  Activity,
  Calendar,
  XCircle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  GripVertical,
  Pencil,
  Check,
  LucideIcon,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';
import { QuickProductSale } from '@/components/sales/QuickProductSale';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';

interface NavItem {
  id: string;
  to: string;
  icon: LucideIcon;
  label: string;
}

const navItemsMap: Record<string, NavItem> = {
  dashboard: { id: 'dashboard', to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  clients: { id: 'clients', to: '/clients', icon: Users, label: 'Klienti' },
  trainings: { id: 'trainings', to: '/trainings', icon: Dumbbell, label: 'Tréninky' },
  exercises: { id: 'exercises', to: '/exercises', icon: Library, label: 'Knihovna cviků' },
  diagnostics: { id: 'diagnostics', to: '/diagnostics', icon: Stethoscope, label: 'Diagnostika' },
  measurements: { id: 'measurements', to: '/measurements', icon: Activity, label: 'Měření' },
  calendar: { id: 'calendar', to: '/calendar', icon: Calendar, label: 'Kalendář' },
  canceled: { id: 'canceled', to: '/canceled', icon: XCircle, label: 'Zrušené' },
  settings: { id: 'settings', to: '/settings', icon: Settings, label: 'Nastavení' },
};

interface SortableNavItemProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  isEditMode: boolean;
}

function SortableNavItem({ item, isActive, collapsed, isEditMode }: SortableNavItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.8 : 1,
  };

  const Icon = item.icon;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground z-10"
        >
          <GripVertical className="w-4 h-4" />
        </div>
      )}
      <NavLink
        to={item.to}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
          isEditMode && 'ml-5',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg glow'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          isDragging && 'ring-2 ring-primary'
        )}
        onClick={(e) => isEditMode && e.preventDefault()}
      >
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0 transition-transform duration-200',
          !isActive && 'group-hover:scale-110'
        )} />
        {!collapsed && (
          <span className="font-medium truncate">{item.label}</span>
        )}
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const location = useLocation();
  const { preferences, updateSidebarOrder } = useLayoutPreferences();

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

  const orderedItems = useMemo(() => {
    return preferences.sidebarOrder
      .map(id => navItemsMap[id])
      .filter(Boolean);
  }, [preferences.sidebarOrder]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = preferences.sidebarOrder.indexOf(active.id as string);
      const newIndex = preferences.sidebarOrder.indexOf(over.id as string);
      const newOrder = arrayMove(preferences.sidebarOrder, oldIndex, newIndex);
      updateSidebarOrder(newOrder);
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo & Notifications */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <span className="text-xl font-bold text-sidebar-foreground tracking-tight">
              FitCoach
            </span>
          )}
        </div>
        {!collapsed && <NotificationCenter />}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={orderedItems.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {orderedItems.map((item) => {
              const isActive = location.pathname === item.to || 
                (item.to !== '/' && location.pathname.startsWith(item.to));

              return (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                  isEditMode={isEditMode}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        
        {/* Quick Product Sale */}
        <div className="pt-2 border-t border-sidebar-border mt-2">
          <QuickProductSale collapsed={collapsed} />
        </div>
      </nav>

      {/* Edit Mode Toggle & Collapse Toggle */}
      <div className="px-3 pb-6 space-y-2">
        {!collapsed && (
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
              isEditMode
                ? "bg-primary text-primary-foreground"
                : "bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground"
            )}
          >
            {isEditMode ? (
              <>
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Hotovo</span>
              </>
            ) : (
              <>
                <Pencil className="w-4 h-4" />
                <span className="text-sm font-medium">Upravit pořadí</span>
              </>
            )}
          </button>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">Sbalit menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
