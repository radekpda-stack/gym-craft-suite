import { ReactNode, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

export interface SettingsCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  badge?: string;
  hidden?: boolean;
}

interface SettingsLayoutProps {
  categories: SettingsCategory[];
  activeCategory: string;
  onCategoryChange: (id: string) => void;
  children: ReactNode;
  title: string;
  subtitle: string;
}

export function SettingsLayout({
  categories,
  activeCategory,
  onCategoryChange,
  children,
  title,
  subtitle,
}: SettingsLayoutProps) {
  const isMobile = useIsMobile();
  const [showMobileContent, setShowMobileContent] = useState(false);

  const visibleCategories = categories.filter(c => !c.hidden);
  const activeItem = categories.find(c => c.id === activeCategory);

  // Mobile: Show category list OR content
  if (isMobile) {
    if (showMobileContent && activeItem) {
      return (
        <div className="space-y-4 animate-fade-in pb-24">
          {/* Back header */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileContent(false)}
              className="shrink-0"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground truncate">
                {activeItem.title}
              </h1>
              <p className="text-sm text-muted-foreground truncate">
                {activeItem.description}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="space-y-4">
            {children}
          </div>
        </div>
      );
    }

    // Category list
    return (
      <div className="space-y-4 animate-fade-in pb-24">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
        </div>

        <div className="space-y-2">
          {visibleCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => {
                onCategoryChange(category.id);
                setShowMobileContent(true);
              }}
              className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 hover:bg-secondary/50 hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
            >
              <div className={cn('p-3 rounded-xl bg-secondary/50 shadow-sm', category.iconColor)}>
                <category.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{category.title}</p>
                  {category.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                      {category.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {category.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: Sidebar + Content
  return (
    <div className="flex gap-6 animate-fade-in min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <div className="w-72 shrink-0">
        <div className="sticky top-4">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
          </div>

          <ScrollArea className="h-[calc(100vh-12rem)]">
            <nav className="space-y-1.5 pr-4">
              {visibleCategories.map((category) => {
                const isActive = activeCategory === category.id;
                return (
                  <button
                    key={category.id}
                    onClick={() => onCategoryChange(category.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all text-left",
                      isActive
                        ? "bg-primary/10 text-primary ring-1 ring-primary/30 shadow-sm"
                        : "hover:bg-secondary/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "p-2 rounded-lg transition-colors",
                      isActive ? "bg-primary/20" : "bg-secondary/50"
                    )}>
                      <category.icon className={cn(
                        "w-4 h-4",
                        isActive ? "text-primary" : category.iconColor
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-medium truncate",
                          isActive && "text-primary"
                        )}>
                          {category.title}
                        </span>
                        {category.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                            {category.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {activeItem && (
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <div className={cn('p-3.5 rounded-2xl bg-secondary/50 shadow-sm', activeItem.iconColor)}>
                <activeItem.icon className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{activeItem.title}</h2>
                <p className="text-sm text-muted-foreground">{activeItem.description}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4 pb-8">
          {children}
        </div>
      </div>
    </div>
  );
}
