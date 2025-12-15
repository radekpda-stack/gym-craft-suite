import { useParams, useSearchParams } from 'react-router-dom';
import { PublicFeedbackFormNew } from '@/components/feedback/PublicFeedbackFormNew';

export default function FeedbackPage() {
  const { token: pathToken } = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('t');
  
  // Support both /feedback/:token and /feedback?t=token
  const token = pathToken || queryToken;

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Neplatný odkaz</p>
      </div>
    );
  }

  return <PublicFeedbackFormNew token={token} />;
}
