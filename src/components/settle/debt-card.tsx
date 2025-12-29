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
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={from.avatar} />
              <AvatarFallback>{from.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="font-medium">{from.name}</p>
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex items-center gap-2">
            <Avatar className="h-10 w-10">
              <AvatarImage src={to.avatar} />
              <AvatarFallback>{to.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <p className="font-medium">{to.name}</p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">owes</p>
          <p className="text-2xl font-bold text-accent">{formattedAmount}</p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
             <Button variant="outline" className="w-full mt-4">
                <Handshake className="mr-2 h-4 w-4" />
                Mark as Paid
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Settlement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to mark this debt as paid? This will record a settlement of {formattedAmount} from {from.name} to {to.name}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => onSettle(debt)}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
