import { useState, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
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
  LogOut,
  Sparkles,
  TrendingUp,
  ShoppingBag,
  Eye,
  EyeOff,
  LucideIcon,
} from 'lucide-react';
import { NotificationCenter } from '@/components/notifications/NotificationCenter';

import { QuickCreditModal } from '@/components/credit/QuickCreditModal';
import { useLayoutPreferences } from '@/hooks/useLayoutPreferences';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/i18n';

interface NavItem {
  id: string;
  to: string;
  icon: LucideIcon;
  labelKey: keyof typeof import('@/lib/i18n/translations/cs').cs.nav;
}

const navItemsMap: Record<string, NavItem> = {
  dashboard: { id: 'dashboard', to: '/', icon: LayoutDashboard, labelKey: 'dashboard' },
  clients: { id: 'clients', to: '/clients', icon: Users, labelKey: 'clients' },
  trainings: { id: 'trainings', to: '/trainings', icon: Dumbbell, labelKey: 'trainings' },
  progress: { id: 'progress', to: '/progress', icon: TrendingUp, labelKey: 'progress' },
  diagnostics: { id: 'diagnostics', to: '/diagnostics', icon: Stethoscope, labelKey: 'diagnostics' },
  measurements: { id: 'measurements', to: '/measurements', icon: Activity, labelKey: 'measurements' },
  sales: { id: 'sales', to: '/sales', icon: ShoppingBag, labelKey: 'sales' },
  calendar: { id: 'calendar', to: '/calendar', icon: Calendar, labelKey: 'calendar' },
  canceled: { id: 'canceled', to: '/canceled', icon: XCircle, labelKey: 'canceled' },
  'ai-assistant': { id: 'ai-assistant', to: '/ai-assistant', icon: Sparkles, labelKey: 'aiAssistant' },
  settings: { id: 'settings', to: '/settings', icon: Settings, labelKey: 'settings' },
};

interface SortableNavItemProps {
  item: NavItem;
  label: string;
  isActive: boolean;
  collapsed: boolean;
  isEditMode: boolean;
  isHidden: boolean;
  onToggleVisibility: () => void;
}

function SortableNavItem({ item, label, isActive, collapsed, isEditMode, isHidden, onToggleVisibility }: SortableNavItemProps) {
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
    opacity: isDragging ? 0.8 : isHidden ? 0.4 : 1,
  };

  const Icon = item.icon;

  return (
    <div ref={setNodeRef} style={style} className="relative">
      {isEditMode && (
        <>
          <div
            {...attributes}
            {...listeners}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground z-10"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleVisibility();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground z-10 rounded-md hover:bg-sidebar-accent"
          >
            {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </>
      )}
      <NavLink
        to={item.to}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group',
          isEditMode && 'ml-5 mr-8',
          isActive
            ? 'bg-primary text-primary-foreground shadow-lg glow'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground',
          isDragging && 'ring-2 ring-primary',
          isHidden && 'line-through'
        )}
        onClick={(e) => isEditMode && e.preventDefault()}
      >
        <Icon className={cn(
          'w-5 h-5 flex-shrink-0 transition-transform duration-200',
          !isActive && 'group-hover:scale-110'
        )} />
        {!collapsed && (
          <span className="font-medium truncate">{label}</span>
        )}
      </NavLink>
    </div>
  );
}

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { preferences, updateSidebarOrder, toggleSidebarItemVisibility, resetToDefaults } = useLayoutPreferences();
  const { signOut, user } = useAuth();
  const { t } = useLanguage();

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
    // Filter out exercises from the order and map to nav items
    const filteredOrder = preferences.sidebarOrder.filter(id => id !== 'exercises');
    const items = filteredOrder
      .map(id => navItemsMap[id])
      .filter(Boolean);
    
    // In edit mode, show all items; otherwise filter out hidden items
    if (isEditMode) {
      return items;
    }
    return items.filter(item => !preferences.hiddenSidebarItems.includes(item.id));
  }, [preferences.sidebarOrder, preferences.hiddenSidebarItems, isEditMode]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const filteredOrder = preferences.sidebarOrder.filter(id => id !== 'exercises');
      const oldIndex = filteredOrder.indexOf(active.id as string);
      const newIndex = filteredOrder.indexOf(over.id as string);
      const newOrder = arrayMove(filteredOrder, oldIndex, newIndex);
      updateSidebarOrder(newOrder);
    }
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: t.errors.generic,
        description: t.auth.logoutError,
        variant: 'destructive',
      });
    } else {
      toast({
        title: t.auth.logoutSuccess,
        description: t.auth.logoutSuccessDesc,
      });
      navigate('/auth', { replace: true });
    }
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen sidebar-glass transition-all duration-300 ease-in-out flex flex-col',
        collapsed ? 'w-20' : 'w-64'
      )}
    >
      {/* Logo & Notifications */}
      <div className="flex items-center justify-between px-6 py-6 border-b border-sidebar-border/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg">
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
              const isHidden = preferences.hiddenSidebarItems.includes(item.id);

              return (
                <SortableNavItem
                  key={item.id}
                  item={item}
                  label={t.nav[item.labelKey]}
                  isActive={isActive}
                  collapsed={collapsed}
                  isEditMode={isEditMode}
                  isHidden={isHidden}
                  onToggleVisibility={() => toggleSidebarItemVisibility(item.id)}
                />
              );
            })}
          </SortableContext>
        </DndContext>
        
        {/* Quick Actions */}
        <div className="pt-2 border-t border-sidebar-border/50 mt-2 space-y-1">
          <QuickCreditModal collapsed={collapsed} />
        </div>
      </nav>

      {/* User & Controls */}
      <div className="px-3 pb-6 space-y-2">
        {/* User email display */}
        {!collapsed && user && (
          <div className="px-4 py-2 text-xs text-sidebar-foreground/50 truncate">
            {user.email}
          </div>
        )}
        
        {/* Logout button */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl glass-subtle text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="text-sm font-medium">{t.nav.logout}</span>}
        </button>

        {!collapsed && (
          <div className="space-y-1">
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl transition-all duration-200",
                isEditMode
                  ? "bg-primary text-primary-foreground"
                  : "glass-subtle text-sidebar-foreground/70 hover:text-sidebar-foreground"
              )}
            >
              {isEditMode ? (
                <>
                  <Check className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.common.done}</span>
                </>
              ) : (
                <>
                  <Pencil className="w-4 h-4" />
                  <span className="text-sm font-medium">{t.nav.editOrder}</span>
                </>
              )}
            </button>
            {isEditMode && (
              <button
                onClick={() => {
                  resetToDefaults();
                  setIsEditMode(false);
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl glass-subtle text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-200"
              >
                <span className="text-sm font-medium">Obnovit výchozí</span>
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl glass-subtle text-sidebar-foreground/70 hover:text-sidebar-foreground transition-all duration-200"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="font-medium">{t.nav.collapseMenu}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
