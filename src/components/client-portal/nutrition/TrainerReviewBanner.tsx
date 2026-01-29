/**
 * TrainerReviewBanner - Shows trainer review status and notes prominently
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CheckCircle2, MessageSquare, Reply, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface TrainerReviewBannerProps {
  /** Whether the day has been checked by trainer */
  isChecked: boolean;
  /** Timestamp when checked */
  checkedAt: string | null;
  /** Trainer's note for the day */
  trainerNote: string | null;
  /** Client's existing reply to the trainer note */
  clientReply?: string | null;
  /** Called when client submits a reply */
  onReply?: (reply: string) => Promise<void>;
  /** Is reply being submitted */
  isReplying?: boolean;
  /** Additional className */
  className?: string;
}

export function TrainerReviewBanner({
  isChecked,
  checkedAt,
  trainerNote,
  clientReply,
  onReply,
  isReplying = false,
  className,
}: TrainerReviewBannerProps) {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');

  // Don't render if nothing to show
  if (!isChecked && !trainerNote) return null;

  const handleSubmitReply = async () => {
    if (!replyText.trim() || !onReply) return;
    await onReply(replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
  };

  const formattedDate = checkedAt 
    ? format(parseISO(checkedAt), 'd.M. v HH:mm', { locale: cs })
    : null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Checked Banner */}
      <AnimatePresence>
        {isChecked && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-success/10 border border-success/20"
          >
            <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-success">
                Zkontrolováno trenérem
              </p>
              {formattedDate && (
                <p className="text-xs text-muted-foreground">
                  {formattedDate}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trainer Note */}
      <AnimatePresence>
        {trainerNote && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Card className="border-primary/20 bg-primary/5 overflow-hidden">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
                      Poznámka od trenéra
                    </p>
                    <p className="text-sm leading-relaxed">{trainerNote}</p>
                  </div>
                </div>

                {/* Client Reply */}
                {clientReply && (
                  <div className="ml-13 p-3 rounded-lg bg-muted/50">
                    <p className="text-xs font-medium text-muted-foreground mb-1">
                      Vaše odpověď:
                    </p>
                    <p className="text-sm">{clientReply}</p>
                  </div>
                )}

                {/* Reply Section */}
                {onReply && !clientReply && (
                  <div className="ml-13">
                    <AnimatePresence mode="wait">
                      {showReplyInput ? (
                        <motion.div
                          key="input"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-2"
                        >
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Napište odpověď..."
                            rows={2}
                            className="resize-none text-sm"
                            autoFocus
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={handleSubmitReply}
                              disabled={!replyText.trim() || isReplying}
                              className="gap-1.5"
                            >
                              {isReplying ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Send className="w-3.5 h-3.5" />
                              )}
                              Odeslat
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setShowReplyInput(false);
                                setReplyText('');
                              }}
                              disabled={isReplying}
                            >
                              Zrušit
                            </Button>
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="button"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowReplyInput(true)}
                            className="gap-1.5 text-primary hover:text-primary"
                          >
                            <Reply className="w-3.5 h-3.5" />
                            Odpovědět
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
