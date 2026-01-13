import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { cs } from "date-fns/locale";
import {
  ClipboardList,
  Clock,
  Check,
  HelpCircle,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  useAvailableFeedbacks,
  useSubmitClientPortalFeedback,
  PendingFeedback,
} from "@/hooks/useClientPortalFeedback";
import { useCompleteNotificationAction } from "@/hooks/useClientPortalNotifications";

// Default help texts for questions
const HELP_TEXTS: Record<string, string> = {
  soreness:
    "Zpožděná svalová bolestivost (DOMS) - pocit ztuhlosti a citlivosti ve svalech.",
  body_feel: "Jak se celkově cítíte fyzicky? Ztuhlost, lehkost, svěžest.",
  energy: "Vaše celková úroveň energie během dne.",
  pain: "Ostrá, bodavá nebo tupá bolest v kloubech, šlachách - NE běžná svalovka.",
  session_fit: "Jak trénink odpovídal vaší kondici a očekávání.",
  difficulty:
    "RPE = jak náročný byl trénink. 1-3: lehké | 4-6: kontrolované | 7-8: na hraně | 9-10: maximum",
  fun: "Jak moc vás trénink bavil?",
};

const QUESTIONS = [
  {
    id: "soreness",
    label: "Svalovka (DOMS)",
    emoji: "💪",
    minLabel: "Žádná",
    maxLabel: "Extrémní",
  },
  {
    id: "energy",
    label: "Energie",
    emoji: "⚡",
    minLabel: "Vyčerpaný",
    maxLabel: "Plný energie",
  },
  {
    id: "pain",
    label: "Bolest (ne svalovka)",
    emoji: "🩹",
    minLabel: "Žádná",
    maxLabel: "Silná",
  },
  {
    id: "difficulty",
    label: "Jak těžký byl trénink (RPE)",
    emoji: "🏋️",
    minLabel: "Lehký",
    maxLabel: "Velmi těžký",
  },
];

const OPTIONAL_QUESTIONS = [
  {
    id: "body_feel",
    label: "Celkový pocit v těle",
    emoji: "🧘",
    minLabel: "Špatně",
    maxLabel: "Výborně",
  },
  {
    id: "session_fit",
    label: "Jak sedl trénink",
    emoji: "🎯",
    minLabel: "Vůbec",
    maxLabel: "Perfektně",
  },
  {
    id: "fun",
    label: "Jak moc to bavilo",
    emoji: "😊",
    minLabel: "Vůbec",
    maxLabel: "Maximálně",
  },
];

interface FeedbackFormProps {
  feedback: PendingFeedback;
  onComplete: () => void;
  onCancel: () => void;
}

function FeedbackForm({ feedback, onComplete, onCancel }: FeedbackFormProps) {
  const [values, setValues] = useState<Record<string, number>>({
    soreness: 5,
    energy: 5,
    pain: 1,
    difficulty: 5,
    body_feel: 5,
    session_fit: 5,
    fun: 5,
  });
  const [showOptional, setShowOptional] = useState(false);
  const [note, setNote] = useState("");
  const submitFeedback = useSubmitClientPortalFeedback();

  const handleSubmit = async () => {
    try {
      await submitFeedback.mutateAsync({
        trainingSessionId: feedback.training_session_id,
        values,
        note: note || undefined,
      });
      toast.success("Zpětná vazba byla odeslána");
      onComplete();
    } catch (error) {
      toast.error("Nepodařilo se odeslat zpětnou vazbu");
    }
  };

  const renderSlider = (question: (typeof QUESTIONS)[0]) => {
    const value = values[question.id] ?? 5;
    const helpText = HELP_TEXTS[question.id];

    return (
      <div key={question.id} className="space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Label className="text-base font-medium">
              <span className="mr-2">{question.emoji}</span>
              {question.label}
            </Label>
            {helpText && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" className="max-w-[280px] text-sm">
                  {helpText}
                </PopoverContent>
              </Popover>
            )}
          </div>
          <span className="text-xl font-bold text-primary">{value}/10</span>
        </div>
        <Slider
          value={[value]}
          onValueChange={([v]) =>
            setValues((prev) => ({ ...prev, [question.id]: v }))
          }
          min={1}
          max={10}
          step={1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{question.minLabel}</span>
          <span>{question.maxLabel}</span>
        </div>

        {/* RPE scale legend */}
        {question.id === "difficulty" && (
          <div className="space-y-2 mt-2 border-t pt-2">
            <p className="text-xs text-muted-foreground text-center">
              Hodnotíš celkovou náročnost na konci tréninku (RPE).
            </p>
            <div className="grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
              <div className="text-center">
                <span className="font-medium text-success">1-3</span>
                <p>rezerva</p>
              </div>
              <div className="text-center">
                <span className="font-medium text-warning">4-6</span>
                <p>kontrola</p>
              </div>
              <div className="text-center">
                <span className="font-medium text-warning">7-8</span>
                <p>na hraně</p>
              </div>
              <div className="text-center">
                <span className="font-medium text-destructive">9-10</span>
                <p>maximum</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
        <div className="flex items-center gap-2 text-primary mb-1">
          <Clock className="w-4 h-4" />
          <span className="font-medium text-sm">
            Trénink z {format(new Date(feedback.training_date), "d. MMMM yyyy", { locale: cs })}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Vyplň prosím 24 hodin po tréninku (po první noci spánku).
        </p>
      </div>

      {/* Main questions */}
      <div className="space-y-6">
        {QUESTIONS.map((q) => renderSlider(q))}
      </div>

      {/* Optional questions */}
      <Collapsible open={showOptional} onOpenChange={setShowOptional}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-between text-muted-foreground"
          >
            <span>Chceš doplnit více detailů? (volitelné)</span>
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                showOptional && "rotate-180"
              )}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-6 pt-4">
          {OPTIONAL_QUESTIONS.map((q) => renderSlider(q))}
        </CollapsibleContent>
      </Collapsible>

      {/* Note */}
      <div className="space-y-2">
        <Label>Poznámka (volitelné)</Label>
        <Textarea
          placeholder="Chceš něco dodat?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
          className="min-h-[80px]"
        />
        <p className="text-xs text-muted-foreground text-right">
          {note.length}/200
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onCancel}>
          Zrušit
        </Button>
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={submitFeedback.isPending}
        >
          {submitFeedback.isPending ? (
            "Odesílám..."
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Odeslat
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}

interface ClientPortalFeedbackSectionProps {
  selectedSessionId?: string | null;
  onClose?: () => void;
}

export function ClientPortalFeedbackSection({
  selectedSessionId,
  onClose,
}: ClientPortalFeedbackSectionProps) {
  const availableFeedbacks = useAvailableFeedbacks();
  const [activeFeedback, setActiveFeedback] = useState<PendingFeedback | null>(
    null
  );

  // If a specific session is selected via notification, find it
  const selectedFeedback = selectedSessionId
    ? availableFeedbacks.find(
        (f) => f.training_session_id === selectedSessionId
      )
    : null;

  const currentFeedback = activeFeedback || selectedFeedback;

  if (currentFeedback) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Zpětná vazba po tréninku
          </CardTitle>
        </CardHeader>
        <CardContent>
          <FeedbackForm
            feedback={currentFeedback}
            onComplete={() => {
              setActiveFeedback(null);
              onClose?.();
            }}
            onCancel={() => {
              setActiveFeedback(null);
              onClose?.();
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (availableFeedbacks.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="relative overflow-hidden border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent shadow-lg shadow-amber-500/10">
        {/* Animated pulse ring */}
        <div className="absolute -top-1 -right-1">
          <span className="relative flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
          </span>
        </div>
        
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 0] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 3 }}
            >
              <ClipboardList className="w-5 h-5" />
            </motion.div>
            Máš nevyplněnou zpětnou vazbu!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <AnimatePresence>
              {availableFeedbacks.map((feedback) => (
                <motion.div
                  key={feedback.training_session_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="p-4 rounded-lg border border-amber-500/30 bg-card/80 backdrop-blur-sm hover:border-amber-500/50 transition-all hover:shadow-md"
                >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      Trénink{" "}
                      {format(
                        new Date(feedback.training_date),
                        "d. MMMM yyyy",
                        { locale: cs }
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        <Clock className="w-3 h-3 mr-1" />
                        Zbývá{" "}
                        {formatDistanceToNow(feedback.feedback_expires_at, {
                          locale: cs,
                        })}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setActiveFeedback(feedback)}
                  >
                    Vyplnit
                  </Button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
    </motion.div>
  );
}
