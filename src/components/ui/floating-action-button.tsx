import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning';
}

interface FloatingActionButtonProps {
  actions: FABAction[];
  className?: string;
}

const variantStyles = {
  default: 'bg-secondary hover:bg-secondary/80 text-foreground',
  primary: 'bg-primary hover:bg-primary/90 text-primary-foreground',
  success: 'bg-success hover:bg-success/90 text-success-foreground',
  warning: 'bg-warning hover:bg-warning/90 text-warning-foreground',
};

export function FloatingActionButton({ actions, className }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOpen = () => setIsOpen(!isOpen);

  const handleAction = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn('fixed bottom-20 right-4 z-40 sm:bottom-6 sm:right-6', className)}>
      {/* Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Action buttons */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-16 right-0 flex flex-col-reverse items-end gap-3 mb-3"
          >
            {actions.map((action, index) => (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  scale: 1,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ 
                  opacity: 0, 
                  y: 10, 
                  scale: 0.8,
                  transition: { delay: (actions.length - index - 1) * 0.03 }
                }}
                className="flex items-center gap-3"
              >
                <span className="px-3 py-1.5 text-sm font-medium bg-popover text-popover-foreground rounded-lg shadow-lg whitespace-nowrap">
                  {action.label}
                </span>
                <Button
                  size="icon"
                  onClick={() => handleAction(action)}
                  className={cn(
                    'h-12 w-12 rounded-full shadow-lg',
                    variantStyles[action.variant || 'default']
                  )}
                >
                  {action.icon}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB button */}
      <motion.div
        animate={{ rotate: isOpen ? 45 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          size="icon"
          onClick={toggleOpen}
          className={cn(
            'h-14 w-14 rounded-full shadow-lg',
            'bg-primary hover:bg-primary/90 text-primary-foreground',
            isOpen && 'bg-secondary hover:bg-secondary/80 text-foreground'
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
        </Button>
      </motion.div>
    </div>
  );
}
