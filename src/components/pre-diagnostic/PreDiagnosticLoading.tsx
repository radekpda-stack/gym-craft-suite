import { motion } from 'framer-motion';

export function PreDiagnosticLoading() {
  return (
    <div className="public-page flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        {/* Animated spinner */}
        <div className="relative w-10 h-10 mx-auto">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-primary/20"
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </div>
        <p className="mt-4 text-muted-foreground">Načítám formulář...</p>
      </motion.div>
    </div>
  );
}
