import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function DemoModeBanner() {
  const navigate = useNavigate();

  const handleClose = () => {
    // Navigate back to the admin page without demo mode
    navigate('/client-portal');
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-950 py-2 px-4">
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <AlertTriangle className="w-4 h-4" />
        <span>DEMO REŽIM – Toto je náhled, jak klienti vidí portál</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 ml-2 hover:bg-amber-600/20"
          onClick={handleClose}
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
