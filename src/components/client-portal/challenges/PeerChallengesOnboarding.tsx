import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Target, Users, Trophy, Eye, ChevronRight, ChevronLeft } from 'lucide-react';

interface PeerChallengesOnboardingProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const steps = [
  {
    icon: Target,
    title: '1. Vyber typ výzvy',
    items: [
      { label: '1v1 Duel', desc: 'Výzva mezi tebou a jedním soupeřem' },
      { label: 'Skupinová', desc: 'Pozvi více klientů přes kód' },
      { label: 'Veřejná', desc: 'Otevřená všem klientům trenéra' },
    ],
  },
  {
    icon: Users,
    title: '2. Definuj pravidla',
    items: [
      { label: 'Vyber cvik nebo aktivitu', desc: 'Např. shyby, běh, dřepy' },
      { label: 'Nastav metriku', desc: 'Čas, opakování nebo vzdálenost' },
      { label: 'Urči časový rámec', desc: 'Jak dlouho výzva poběží' },
    ],
  },
  {
    icon: Trophy,
    title: '3. Soutěž a sleduj pořadí',
    items: [
      { label: 'Odesílej výsledky', desc: 'Každý může odeslat více pokusů' },
      { label: 'Sleduj žebříček', desc: 'Počítá se nejlepší výsledek' },
      { label: 'Získávej body', desc: 'XP za účast a vítězství' },
    ],
  },
];

export function PeerChallengesOnboarding({ open, onClose }: PeerChallengesOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onClose(dontShowAgain);
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose(dontShowAgain)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="h-6 w-6 text-primary" />
            Výzvy mezi klienty
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-muted-foreground mb-6">
            Vytvoř si vlastní výzvu a změř síly s ostatními!
          </p>

          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 w-8 rounded-full transition-colors ${
                  index === currentStep
                    ? 'bg-primary'
                    : index < currentStep
                    ? 'bg-primary/50'
                    : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Current step content */}
          <div className="bg-muted/50 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-primary/10">
                <StepIcon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{currentStepData.title}</h3>
            </div>

            <div className="space-y-3">
              {currentStepData.items.map((item, i) => (
                <div key={i} className="flex items-start gap-3 pl-2">
                  <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <div>
                    <span className="font-medium">{item.label}</span>
                    <span className="text-muted-foreground"> – {item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Trainer info */}
          <div className="flex items-center gap-2 mt-4 p-3 bg-blue-500/10 rounded-lg text-sm">
            <Eye className="h-4 w-4 text-blue-500 shrink-0" />
            <span className="text-muted-foreground">
              Tvůj trenér vidí všechny výzvy a může je komentovat
            </span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 mr-auto">
            <Checkbox
              id="dontShow"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label htmlFor="dontShow" className="text-sm text-muted-foreground cursor-pointer">
              Příště nezobrazovat
            </label>
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zpět
              </Button>
            )}
            <Button onClick={handleNext}>
              {isLastStep ? (
                'Rozumím, pojďme na to!'
              ) : (
                <>
                  Další
                  <ChevronRight className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
