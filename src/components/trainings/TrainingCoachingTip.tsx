/**
 * TrainingCoachingTip - Automated coaching suggestions based on previous training data
 * Provides actionable tips for trainers based on client feedback
 */

import { LastTrainingData } from '@/hooks/useLastTraining';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrainingCoachingTipProps {
  lastTraining: LastTrainingData;
}

interface CoachingTip {
  id: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

function generateCoachingTips(lastTraining: LastTrainingData): CoachingTip[] {
  const tips: CoachingTip[] = [];
  const feedback = lastTraining.feedback;

  if (!feedback) return tips;

  // High soreness → consider different body parts
  if (feedback.soreness && feedback.soreness >= 7) {
    const bodyParts = lastTraining.bodyPartTags.map(t => t.name).join(', ');
    if (bodyParts) {
      tips.push({
        id: 'high_soreness',
        message: `Klient měl silnou svalovku (${feedback.soreness}/10) na ${bodyParts}. Zvažte začít jinou partií.`,
        priority: 'high',
      });
    } else {
      tips.push({
        id: 'high_soreness_general',
        message: `Klient hlásil silnou svalovku (${feedback.soreness}/10). Zvažte nižší objem nebo jiné partie.`,
        priority: 'high',
      });
    }
  }

  // Low energy → adjust intensity
  if (feedback.energy_rating && feedback.energy_rating <= 4) {
    tips.push({
      id: 'low_energy',
      message: `Klient hlásil nízkou energii (${feedback.energy_rating}/10). Zvažte kratší nebo méně intenzivní trénink.`,
      priority: 'medium',
    });
  }

  // Pain reported → ask about current state
  if (feedback.pain && feedback.pain >= 5) {
    const painAreas = feedback.muscle_soreness?.length > 0 
      ? ` (${feedback.muscle_soreness.join(', ')})` 
      : '';
    tips.push({
      id: 'pain_reported',
      message: `Klient hlásil bolest (${feedback.pain}/10)${painAreas}. Zeptejte se na aktuální stav.`,
      priority: 'high',
    });
  }

  // Session didn't fit well → discuss program adjustments
  if (feedback.session_fit && feedback.session_fit <= 4) {
    tips.push({
      id: 'poor_session_fit',
      message: `Minulý trénink klientovi příliš neseděl (${feedback.session_fit}/10). Diskutujte o úpravě programu.`,
      priority: 'medium',
    });
  }

  // High client RPE vs coach perception
  if (feedback.difficulty && feedback.difficulty >= 9 && lastTraining.rpe && lastTraining.rpe <= 6) {
    tips.push({
      id: 'rpe_mismatch',
      message: `Rozdíl v hodnocení náročnosti: klient ${feedback.difficulty}/10, trenér ${lastTraining.rpe}/10. Zkalibrujte vnímání zátěže.`,
      priority: 'medium',
    });
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return tips;
}

export function TrainingCoachingTip({ lastTraining }: TrainingCoachingTipProps) {
  const tips = generateCoachingTips(lastTraining);

  if (tips.length === 0) return null;

  // Show only the first (highest priority) tip for compactness
  const tip = tips[0];

  return (
    <div className={cn(
      "flex items-start gap-2 p-2.5 rounded-lg mt-2",
      tip.priority === 'high' ? "bg-warning/10 border border-warning/20" : "bg-primary/5 border border-primary/10"
    )}>
      <Lightbulb className={cn(
        "w-4 h-4 mt-0.5 shrink-0",
        tip.priority === 'high' ? "text-warning" : "text-primary"
      )} />
      <p className="text-xs text-foreground leading-relaxed">
        {tip.message}
      </p>
    </div>
  );
}
