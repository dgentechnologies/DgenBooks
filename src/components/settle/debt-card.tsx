import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake } from "lucide-react";
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
  onSettle: (debt: Debt) => void;
}

export function DebtCard({ debt, onSettle }: DebtCardProps) {
  const { from, to, amount } = debt;

  const formattedAmount = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);

  return (
    <Card className="card-hover gradient-overlay overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-primary/20">
              <AvatarImage src={from.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {from.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm sm:text-base truncate">{from.name}</p>
          </div>
          <div className="flex sm:hidden items-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90" />
          </div>
          <div className="hidden sm:flex items-center">
            <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Avatar className="h-10 w-10 sm:h-12 sm:w-12 ring-2 ring-accent/20">
              <AvatarImage src={to.avatar} />
              <AvatarFallback className="bg-accent/10 text-accent font-semibold">
                {to.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <p className="font-medium text-sm sm:text-base truncate">{to.name}</p>
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
                Are you sure you want to mark this debt as paid? This will record a settlement of {formattedAmount} from {from.name} to {to.name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
              <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => onSettle(debt)}
                className="w-full sm:w-auto"
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
