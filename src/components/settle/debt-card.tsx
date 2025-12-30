import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import type { Debt } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface DebtCardProps {
  debt: Debt;
  onSettle: (debt: Debt, customAmount?: number) => void;
}

export function DebtCard({ debt, onSettle }: DebtCardProps) {
  const { from, to, amount } = debt;
  const [customAmount, setCustomAmount] = useState<string>(amount.toFixed(2));
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

  // Format name to sentence case (capitalize first letter of each word)
  const formatName = (name: string) => {
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const handleSettle = () => {
    if (useCustomAmount) {
      const parsedAmount = parseFloat(customAmount);
      if (!isNaN(parsedAmount) && parsedAmount > 0) {
        onSettle(debt, parsedAmount);
      }
    } else {
      onSettle(debt);
    }
  };

  return (
    <Card className="card-hover gradient-overlay overflow-hidden w-full sm:max-w-md mx-auto">
      <CardContent className="p-4 sm:p-6">
        {/* Header: "Who Owes Who" section with responsive layout */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-4 w-full">
          {/* Payer: Avatar + Name (with truncate for long names) */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/20 shrink-0">
              <AvatarImage src={from.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {from.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm sm:text-base truncate">{formatName(from.name)}</p>
          </div>

          {/* Arrow Icon - vertical on mobile, horizontal on larger screens */}
          <div className="flex sm:hidden justify-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90 shrink-0" />
          </div>
          <div className="hidden sm:flex items-center mx-2">
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>

          {/* Payee: Avatar + Name (with truncate for long names) */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-accent/20 shrink-0">
              <AvatarImage src={to.avatar} />
              <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                {to.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm sm:text-base truncate">{formatName(to.name)}</p>
          </div>
        </div>
        <div className="mt-4 sm:mt-6 text-center py-3 sm:py-4 bg-accent/5 rounded-lg">
          <p className="text-xs sm:text-sm text-muted-foreground">owes</p>
          <p className="text-xl sm:text-2xl font-bold text-accent mt-1">{formattedAmount}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Button 
               variant="outline" 
               className="w-full mt-4 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
             >
                <Handshake className="mr-2 h-4 w-4" />
                Mark as Paid
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="max-w-[min(95vw,28rem)]">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline">Confirm Settlement</AlertDialogTitle>
              <AlertDialogDescription className="text-sm sm:text-base">
                {useCustomAmount ? (
                  <>Record a partial settlement of ₹{customAmount} from {formatName(from.name)} to {formatName(to.name)}.</>
                ) : (
                  <>Are you sure you want to mark this debt as paid? This will record a settlement of {formattedAmount} from {formatName(from.name)} to {formatName(to.name)}.</>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="useCustomAmount"
                  checked={useCustomAmount}
                  onChange={(e) => setUseCustomAmount(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="useCustomAmount" className="text-sm font-medium cursor-pointer">
                  Pay custom amount
                </Label>
              </div>
              {useCustomAmount && (
                <div className="space-y-2">
                  <Label htmlFor="customAmount">Amount</Label>
                  <Input
                    id="customAmount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={amount}
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum: {formattedAmount}
                  </p>
                </div>
              )}
            </div>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleSettle}
                className="w-full sm:w-auto"
                disabled={useCustomAmount && (parseFloat(customAmount) <= 0 || parseFloat(customAmount) > amount)}
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
