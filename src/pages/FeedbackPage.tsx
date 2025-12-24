import { useParams, useSearchParams } from 'react-router-dom';
import { PublicFeedbackFormNew } from '@/components/feedback/PublicFeedbackFormNew';
import { usePageTracking } from '@/hooks/useFeatureTracking';

export default function FeedbackPage() {
  usePageTracking('public_feedback');
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('t');
  
  // Support both /feedback/:token and /feedback?t=token
  const token = pathToken || queryToken;

  const isUuid = (value: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim());

  if (!token || !isUuid(token)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Neplatný odkaz</p>
      </div>
    );
  }

  return <PublicFeedbackFormNew token={token} />;
}
