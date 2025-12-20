import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton = ({ onClick }: FloatingAddButtonProps) => {
  return (
    <motion.button
      onClick={onClick}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full 
        bg-gradient-to-br from-blue-500 to-blue-600 
        text-white shadow-lg shadow-blue-500/30
        flex items-center justify-center
        hover:shadow-xl hover:shadow-blue-500/40
        transition-shadow duration-300"
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </motion.button>
  );
};
