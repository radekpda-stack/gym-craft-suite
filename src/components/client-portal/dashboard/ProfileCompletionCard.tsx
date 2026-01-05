import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  AlertCircle, 
  ChevronRight, 
  Mail, 
  Phone, 
  Calendar, 
  Hand,
  Briefcase,
  Moon,
  Activity,
  Heart
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { useClientPortalProfileData } from '@/hooks/useClientPortalProfile';

interface MissingField {
  key: string;
  label: string;
  icon: React.ReactNode;
}

export function ProfileCompletionCard() {
  const { data: profile, isLoading } = useClientPortalProfileData();

  const { missingFields, completionPercent } = useMemo(() => {
    if (!profile) return { missingFields: [], completionPercent: 0 };

    const fields: MissingField[] = [];
    
    // Check each required field
    if (!profile.email) {
      fields.push({ key: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" /> });
    }
    if (!profile.phone) {
      fields.push({ key: 'phone', label: 'Telefon', icon: <Phone className="w-3.5 h-3.5" /> });
    }
    if (!profile.birth_date) {
      fields.push({ key: 'birth_date', label: 'Datum narození', icon: <Calendar className="w-3.5 h-3.5" /> });
    }
    if (!profile.handedness) {
      fields.push({ key: 'handedness', label: 'Dominantní ruka', icon: <Hand className="w-3.5 h-3.5" /> });
    }
    if (!profile.occupation) {
      fields.push({ key: 'occupation', label: 'Typ práce', icon: <Briefcase className="w-3.5 h-3.5" /> });
    }
    if (!profile.sleep_hours) {
      fields.push({ key: 'sleep_hours', label: 'Spánek', icon: <Moon className="w-3.5 h-3.5" /> });
    }
    if (!profile.sports_history) {
      fields.push({ key: 'sports_history', label: 'Sportovní historie', icon: <Activity className="w-3.5 h-3.5" /> });
    }
    if (!profile.health_restrictions) {
      fields.push({ key: 'health_restrictions', label: 'Zdravotní omezení', icon: <Heart className="w-3.5 h-3.5" /> });
    }

    const totalFields = 8;
    const filledFields = totalFields - fields.length;
    const percent = Math.round((filledFields / totalFields) * 100);

    return { missingFields: fields, completionPercent: percent };
  }, [profile]);

  // Don't show if loading or profile is complete
  if (isLoading || missingFields.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      <Card className="relative overflow-hidden border-warning/30 bg-gradient-to-br from-warning/15 via-warning/10 to-warning/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Pulsing Icon */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-warning" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full animate-pulse" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <h3 className="font-semibold text-sm">Doplňte svůj profil</h3>
                <span className="text-xs font-medium text-muted-foreground">
                  {completionPercent}%
                </span>
              </div>

              {/* Progress Bar */}
              <Progress value={completionPercent} className="h-1.5 mb-3" />

              {/* Missing Fields - show first 4 */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {missingFields.slice(0, 4).map((field) => (
                  <span
                    key={field.key}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-background/60 text-xs text-muted-foreground"
                  >
                    {field.icon}
                    {field.label}
                  </span>
                ))}
                {missingFields.length > 4 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-background/60 text-xs text-muted-foreground">
                    +{missingFields.length - 4} další
                  </span>
                )}
              </div>

              {/* CTA Button */}
              <Link to="/client/settings">
                <Button size="sm" variant="outline" className="w-full gap-2 bg-background/50 hover:bg-background">
                  Doplnit údaje
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
