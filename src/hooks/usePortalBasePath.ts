import { useLocation } from 'react-router-dom';

/**
 * Returns the base path for the client portal ("/zona" or "/client")
 * based on the current URL, ensuring consistent navigation.
 */
export function usePortalBasePath(): string {
  const location = useLocation();
  return location.pathname.startsWith('/zona') ? '/zona' : '/client';
}
