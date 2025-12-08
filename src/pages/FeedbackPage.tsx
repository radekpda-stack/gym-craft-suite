import { useParams } from 'react-router-dom';
import { PublicFeedbackForm } from '@/components/feedback/PublicFeedbackForm';

export default function FeedbackPage() {
  const { token } = useParams<{ token: string }>();

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Neplatný odkaz</p>
      </div>
    );
  }

  return <PublicFeedbackForm token={token} />;
}
