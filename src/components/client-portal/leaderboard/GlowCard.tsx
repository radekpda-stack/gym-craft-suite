import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  glowColor?: string;
  isHighlighted?: boolean;
}

export function GlowCard({ 
  children, 
  className, 
  onClick,
  glowColor = 'primary',
  isHighlighted = false
}: GlowCardProps) {
  return (
    <motion.div
      className={cn(
        "relative group cursor-pointer overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:shadow-lg hover:border-primary/30",
        isHighlighted && "border-primary/30 shadow-md",
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      {/* Glow effect on hover */}
      <motion.div
        className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
          "bg-gradient-to-br from-primary/5 via-transparent to-primary/5"
        )}
      />
      
      {/* Animated border glow */}
      <motion.div
        className={cn(
          "absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none",
          "bg-gradient-to-r from-primary/20 via-transparent to-primary/20"
        )}
        style={{ 
          background: `linear-gradient(90deg, hsl(var(--${glowColor}) / 0.2), transparent, hsl(var(--${glowColor}) / 0.2))`,
          backgroundSize: '200% 100%'
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 0%', '0% 0%']
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "linear"
        }}
      />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}
