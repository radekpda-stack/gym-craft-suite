import { useSearchParams } from 'react-router-dom';
import { PublicFeedbackFormNew } from '@/components/feedback/PublicFeedbackFormNew';

export default function FeedbackPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('t');

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Neplatný odkaz</p>
      </div>
    );
  }

  return <PublicFeedbackFormNew token={token} />;
}
