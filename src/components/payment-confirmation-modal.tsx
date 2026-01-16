import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/format";

interface PaymentConfirmationModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  itemName: string;
  shareAmount: number;
  onConfirm: (amount: number) => void;
  payerName: string;
  recipientName: string;
}

export function PaymentConfirmationModal({
  isOpen,
  onOpenChange,
  itemName,
  shareAmount,
  onConfirm,
  payerName,
  recipientName,
}: PaymentConfirmationModalProps) {
  const [paymentType, setPaymentType] = useState<"full" | "partial">("full");
  const [customAmount, setCustomAmount] = useState<string>(shareAmount.toFixed(2));

  const handleConfirm = () => {
    const amount = paymentType === "full" ? shareAmount : parseFloat(customAmount);
    
    if (isNaN(amount) || amount <= 0) {
      return;
    }
    
    if (amount > shareAmount) {
      return;
    }
    
    onConfirm(amount);
    onOpenChange(false);
    
    // Reset state for next use
    setPaymentType("full");
    setCustomAmount(shareAmount.toFixed(2));
  };

  // Update custom amount when share amount changes or payment type changes to full
  const handlePaymentTypeChange = (value: string) => {
    setPaymentType(value as "full" | "partial");
    if (value === "full") {
      setCustomAmount(shareAmount.toFixed(2));
    }
  };

  const parsedAmount = parseFloat(customAmount);
  const isValidAmount = !isNaN(parsedAmount) && parsedAmount > 0 && parsedAmount <= shareAmount;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Confirm Payment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Context: Item being settled */}
          <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
            <p className="text-sm text-muted-foreground">Settling share for:</p>
            <p className="font-semibold text-lg mt-1">{itemName}</p>
            <p className="text-sm text-muted-foreground mt-2">
              {payerName} → {recipientName}
            </p>
          </div>

          {/* Payment Type Selection */}
          <div className="space-y-3">
            <Label>Payment Type</Label>
            <RadioGroup value={paymentType} onValueChange={handlePaymentTypeChange}>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5 cursor-pointer">
                <RadioGroupItem value="full" id="full" />
                <Label htmlFor="full" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Full Settlement</p>
                    <p className="text-sm text-muted-foreground">
                      Pay the complete share: {formatCurrency(shareAmount)}
                    </p>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/5 cursor-pointer">
                <RadioGroupItem value="partial" id="partial" />
                <Label htmlFor="partial" className="flex-1 cursor-pointer">
                  <div>
                    <p className="font-medium">Partial Payment</p>
                    <p className="text-sm text-muted-foreground">
                      Pay a custom amount
                    </p>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Amount Field */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                ₹
              </span>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={shareAmount}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                disabled={paymentType === "full"}
                className="pl-8"
                placeholder="Enter amount"
              />
            </div>
            {paymentType === "partial" && (
              <p className="text-xs text-muted-foreground">
                Maximum: {formatCurrency(shareAmount)}
              </p>
            )}
            {paymentType === "partial" && !isValidAmount && parsedAmount > 0 && (
              <p className="text-xs text-red-600">
                Amount cannot exceed {formatCurrency(shareAmount)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={paymentType === "partial" && !isValidAmount}
            className="w-full sm:w-auto"
          >
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
