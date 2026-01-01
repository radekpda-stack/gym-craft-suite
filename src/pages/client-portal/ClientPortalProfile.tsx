import { Navigate } from 'react-router-dom';

// Profile page is now merged into Settings
// This component redirects for backward compatibility
export default function ClientPortalProfile() {
  return <Navigate to="/client/settings" replace />;
}
