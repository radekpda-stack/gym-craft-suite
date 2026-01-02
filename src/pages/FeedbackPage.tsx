import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PublicFeedbackFormNew } from '@/components/feedback/PublicFeedbackFormNew';
import { usePageTracking } from '@/hooks/useFeatureTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';

const UUID_REGEX = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function extractUuid(input: string): string | null {
  const trimmed = input.trim();
  const decoded = (() => {
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  })();

  const match = decoded.match(UUID_REGEX);
  return match?.[0] ?? null;
}

export default function FeedbackPage() {
  usePageTracking('public_feedback');
  const navigate = useNavigate();
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('t');

  // Support both /feedback/:token and /feedback?t=token
  const token = useMemo(() => extractUuid(pathToken || queryToken || ''), [pathToken, queryToken]);

  const [pasted, setPasted] = useState('');

  if (!token) {
    const canExtractFromPasted = !!extractUuid(pasted);
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="jm-card w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-h2">Neplatný odkaz</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-body text-muted-foreground">
              Odkaz neobsahuje platný kód. Pokud jste zkopírovali celou zprávu, vložte ji sem – odkaz najdeme automaticky.
            </p>
            <Textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Vložte sem zkopírovaný text nebo odkaz…"
              rows={4}
              className="jm-input"
            />
            <Button
              className="w-full jm-btn-primary"
              onClick={() => {
                const extracted = extractUuid(pasted);
                if (extracted) navigate(`/feedback/${extracted}`);
              }}
              disabled={!canExtractFromPasted}
            >
              Otevřít formulář
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <PublicFeedbackFormNew token={token} />;
}
