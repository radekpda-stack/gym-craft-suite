import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageBreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function PageBreadcrumbs({ items, className }: PageBreadcrumbsProps) {
  return (
    <nav className={cn('flex items-center gap-1 text-sm', className)}>
      <Link 
        to="/" 
        className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-secondary/50"
      >
        <Home className="w-4 h-4" />
      </Link>
      
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-1">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          {item.href ? (
            <Link 
              to={item.href}
              className="text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded hover:bg-secondary/50"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium px-1.5 py-0.5">
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}
