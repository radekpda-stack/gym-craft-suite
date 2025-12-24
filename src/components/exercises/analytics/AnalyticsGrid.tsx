import { ReactNode } from 'react';
import { motion, Variants, Easing } from 'framer-motion';

interface AnalyticsGridProps {
  children: ReactNode;
}

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: 'easeOut' as Easing,
    },
  },
};

export function AnalyticsGrid({ children }: AnalyticsGridProps) {
  return (
    <motion.div
      className="grid grid-cols-1 md:grid-cols-2 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
}

export function AnalyticsGridItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div variants={itemVariants} className={className}>
      {children}
    </motion.div>
  );
}
