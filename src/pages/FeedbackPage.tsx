import { useParams, useSearchParams } from 'react-router-dom';
import { PublicFeedbackFormNew } from '@/components/feedback/PublicFeedbackFormNew';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function FeedbackPage() {
  usePageTracking('public_feedback');
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('t');
  
  // Support both /feedback/:token and /feedback?t=token
  const rawToken = (pathToken || queryToken || '').trim();
  const decodedToken = (() => {
    try {
      return decodeURIComponent(rawToken);
    } catch {
      return rawToken;
    }
  })();

  // Be resilient to users pasting full messages or URLs: extract first UUID if present
  const uuidMatch = decodedToken.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i
  );
  const token = uuidMatch?.[0];

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Neplatný odkaz</p>
      </div>
    );
  }

  return <PublicFeedbackFormNew token={token} />;
}
