import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { CartPanel } from './CartPanel';
import { PaymentMethod } from '@/services/saleProcessor';
import { useSalesCartWithDiscount } from '@/hooks/useSalesCartWithDiscount';

interface MobileCartDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: ReturnType<typeof useSalesCartWithDiscount>;
  paymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  saleNote: string;
  onSaleNoteChange: (note: string) => void;
  clientCreditBalance?: number | null;
  hasCreditTopup: boolean;
  isProcessing: boolean;
  checkoutDisabled: boolean;
  onSale: () => void;
  selectedClient: string;
  noClient: boolean;
}

export function MobileCartDrawer({
  open,
  onOpenChange,
  cart,
  paymentMethod,
  onPaymentMethodChange,
  saleNote,
  onSaleNoteChange,
  clientCreditBalance,
  hasCreditTopup,
  isProcessing,
  checkoutDisabled,
  onSale,
  selectedClient,
  noClient,
}: MobileCartDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle>Košík ({cart.totals.itemCount})</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 overflow-y-auto">
          <CartPanel
            cart={cart}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={onPaymentMethodChange}
            saleNote={saleNote}
            onSaleNoteChange={onSaleNoteChange}
            clientCreditBalance={clientCreditBalance}
            hasCreditTopup={hasCreditTopup}
            isProcessing={isProcessing}
            checkoutDisabled={checkoutDisabled}
            onSale={() => {
              onSale();
              onOpenChange(false);
            }}
            selectedClient={selectedClient}
            noClient={noClient}
          />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
