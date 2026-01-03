import { TrendingUp, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { motion } from 'framer-motion';

interface ProgressLinkCardProps {
  delay?: number;
}

export function ProgressLinkCard({ delay = 0 }: ProgressLinkCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Link to="/client/progress">
        <Card className="relative overflow-hidden bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent border-blue-500/20 hover:border-blue-500/40 transition-colors cursor-pointer h-full">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pokrok</p>
                  <p className="text-sm font-medium">Měření a grafy</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
