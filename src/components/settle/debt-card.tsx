import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake, Eye, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switcher1 } from "@/components/ui/switcher1";
import { useState, useMemo } from "react";
import type { Debt, Transaction, Purchase } from "@/lib/types";
import { formatName, formatCurrency } from "@/lib/format";
import { getCategoryIcon } from "@/lib/category-icons";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useUser } from "@/firebase"


// View debt details dialog component
function ViewDebtDialog({ debt, transactions }: { debt: Debt; transactions: Transaction[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();

  // Get all purchases related to this debt
  // Include expenses where:
  // - The debtor (from) has a share/participated
  // - OR the creditor (to) paid for it
  // This gives complete context for the debt relationship
  const relevantPurchases = useMemo(() => {
    return transactions.filter((t): t is Purchase => {
      if (t.type !== 'purchase') return false;
      
      const debtorParticipated = t.splitWith.includes(debt.from.id);
      const creditorPaid = t.paymentType === 'multiple' 
        ? (t.paidByAmounts && (t.paidByAmounts[debt.to.id] || 0) > 0)
        : t.paidById === debt.to.id;
      
      // Include if debtor participated OR if creditor paid (to show full context)
      return debtorParticipated || creditorPaid;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date, newest first
  }, [transactions, debt]);

  // Get all settlements between these two users
  const relevantSettlements = useMemo(() => {
    return transactions.filter(t => {
      if (t.type !== 'settlement') return false;
      return (
        (t.fromId === debt.from.id && t.toId === debt.to.id) ||
        (t.fromId === debt.to.id && t.toId === debt.from.id)
      );
    });
  }, [transactions, debt]);

  // Calculate amounts
  const calculations = useMemo(() => {
    let fromPaidTotal = 0;
    let toPaidTotal = 0;
    let fromShareTotal = 0;
    let toShareTotal = 0;
    
    relevantPurchases.forEach(purchase => {
      const sharePerPerson = purchase.amount / purchase.splitWith.length;
      
      // Calculate what each person paid
      if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
        fromPaidTotal += purchase.paidByAmounts[debt.from.id] || 0;
        toPaidTotal += purchase.paidByAmounts[debt.to.id] || 0;
      } else {
        if (purchase.paidById === debt.from.id) {
          fromPaidTotal += purchase.amount;
        } else if (purchase.paidById === debt.to.id) {
          toPaidTotal += purchase.amount;
        }
      }
      
      // Calculate what each person's share is
      if (purchase.splitWith.includes(debt.from.id)) {
        fromShareTotal += sharePerPerson;
      }
      if (purchase.splitWith.includes(debt.to.id)) {
        toShareTotal += sharePerPerson;
      }
    });
    
    // Calculate settlements
    let settlementsFromTo = 0;
    let settlementsToFrom = 0;
    
    relevantSettlements.forEach(settlement => {
      if (settlement.type === 'settlement') {
        if (settlement.fromId === debt.from.id && settlement.toId === debt.to.id) {
          settlementsFromTo += settlement.amount;
        } else if (settlement.fromId === debt.to.id && settlement.toId === debt.from.id) {
          settlementsToFrom += settlement.amount;
        }
      }
    });
    
    return {
      fromPaidTotal,
      toPaidTotal,
      fromShareTotal,
      toShareTotal,
      settlementsFromTo,
      settlementsToFrom,
    };
  }, [relevantPurchases, relevantSettlements, debt]);

  const isCurrentUserDebtor = user?.uid === debt.from.id;
  const currentUserPaid = isCurrentUserDebtor ? calculations.fromPaidTotal : calculations.toPaidTotal;
  const currentUserShare = isCurrentUserDebtor ? calculations.fromShareTotal : calculations.toShareTotal;
  const currentUserSettled = isCurrentUserDebtor ? calculations.settlementsFromTo : calculations.settlementsToFrom;
  const otherUserPaid = isCurrentUserDebtor ? calculations.toPaidTotal : calculations.fromPaidTotal;
  
  // Calculate net amounts
  const fromNet = calculations.fromPaidTotal - calculations.fromShareTotal;
  const toNet = calculations.toPaidTotal - calculations.toShareTotal;
  const currentUserNet = currentUserPaid - currentUserShare;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full">
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Debt Breakdown</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Debt Overview */}
          <div className="flex items-center justify-between p-4 bg-accent/10 rounded-lg">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={debt.from.avatar} />
                <AvatarFallback>{debt.from.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{formatName(debt.from.name)}</p>
                <p className="text-sm text-muted-foreground">owes</p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="font-medium">{formatName(debt.to.name)}</p>
                <p className="text-xl font-bold text-primary">{formatCurrency(debt.amount)}</p>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={debt.to.avatar} />
                <AvatarFallback>{debt.to.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Expenses Contributing to Debt */}
          {relevantPurchases.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Related Expenses</h3>
              <div className="space-y-3">
                {relevantPurchases.map((purchase) => {
                  const CategoryIcon = getCategoryIcon(purchase.category);
                  const sharePerPerson = purchase.amount / purchase.splitWith.length;
                  
                  // Determine who paid for this expense
                  let paidBy: string = '';
                  let expenseFromPaid = 0;
                  let expenseToPaid = 0;
                  
                  if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
                    expenseFromPaid = purchase.paidByAmounts[debt.from.id] || 0;
                    expenseToPaid = purchase.paidByAmounts[debt.to.id] || 0;
                    
                    if (expenseFromPaid > 0 && expenseToPaid > 0) {
                      paidBy = `Paid by both (${formatName(debt.from.name)}: ${formatCurrency(expenseFromPaid)}, ${formatName(debt.to.name)}: ${formatCurrency(expenseToPaid)})`;
                    } else if (expenseFromPaid > 0) {
                      paidBy = `Paid by ${formatName(debt.from.name)}`;
                    } else if (expenseToPaid > 0) {
                      paidBy = `Paid by ${formatName(debt.to.name)}`;
                    } else {
                      // Paid by someone else
                      const payerIds = Object.keys(purchase.paidByAmounts);
                      paidBy = payerIds.length > 0 ? `Paid by others` : 'Unknown payer';
                    }
                  } else {
                    if (purchase.paidById === debt.from.id) {
                      expenseFromPaid = purchase.amount;
                      paidBy = `Paid by ${formatName(debt.from.name)}`;
                    } else if (purchase.paidById === debt.to.id) {
                      expenseToPaid = purchase.amount;
                      paidBy = `Paid by ${formatName(debt.to.name)}`;
                    } else {
                      // Paid by someone else - find their name if possible
                      paidBy = `Paid by others`;
                    }
                  }
                  
                  // Calculate shares for both users
                  const fromShare = purchase.splitWith.includes(debt.from.id) ? sharePerPerson : 0;
                  const toShare = purchase.splitWith.includes(debt.to.id) ? sharePerPerson : 0;
                  
                  // Calculate net effect: what they paid minus their share
                  const expenseFromNet = expenseFromPaid - fromShare;
                  const expenseToNet = expenseToPaid - toShare;
                  
                  // Determine if this expense is relevant to show
                  const debtorHasShare = fromShare > 0;
                  const showExpense = debtorHasShare || expenseFromPaid > 0 || expenseToPaid > 0;
                  
                  if (!showExpense) return null;
                  
                  return (
                    <div key={purchase.id} className="border rounded-lg p-3 bg-muted/30">
                      {/* Expense Header */}
                      <div className="flex items-start gap-2 mb-3">
                        <div className="rounded-full p-1.5 bg-accent/10 flex-shrink-0 mt-0.5">
                          <CategoryIcon className="h-3 w-3 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{purchase.itemName}</p>
                          <p className="text-xs text-muted-foreground">{purchase.category}</p>
                          <p className="text-xs font-medium text-primary mt-1">{paidBy}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(purchase.date).toLocaleDateString('en-IN', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-semibold text-sm">{formatCurrency(purchase.amount)}</p>
                          <p className="text-xs text-muted-foreground">Total Cost</p>
                        </div>
                      </div>
                      
                      {/* Per-Person Breakdown - Focus on Debtor's Share */}
                      <div className="space-y-2 pt-2 border-t">
                        {/* Debtor (From User) - Highlighted */}
                        {debtorHasShare && (
                          <div className="bg-red-500/5 rounded p-2 border border-red-500/20">
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="font-medium">{formatName(debt.from.name)}'s Share:</div>
                              <div className="text-right font-semibold text-red-600">
                                {formatCurrency(fromShare)}
                              </div>
                              <div className="text-right text-xs text-muted-foreground">
                                {expenseFromPaid > 0 ? `(Paid ${formatCurrency(expenseFromPaid)})` : '(Paid ₹0)'}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {/* Creditor (To User) - If involved */}
                        {toShare > 0 && (
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="font-medium truncate">{formatName(debt.to.name)}'s Share:</div>
                            <div className="text-right">
                              {formatCurrency(toShare)}
                            </div>
                            <div className="text-right text-xs text-muted-foreground">
                              {expenseToPaid > 0 ? `(Paid ${formatCurrency(expenseToPaid)})` : '(Paid ₹0)'}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Settlement Calculation - Based on System Calculation */}
          <div>
            <h3 className="font-semibold mb-3">Pairwise Debt Calculation</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Net debt between {formatName(debt.from.name)} and {formatName(debt.to.name)} only
            </p>
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Amount Owed</p>
                  <p className="text-lg font-semibold mt-1">
                    {formatName(debt.from.name)} → {formatName(debt.to.name)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-accent">{formatCurrency(debt.amount)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-blue-500/5 rounded text-xs text-muted-foreground">
              <p>💡 This amount represents the net debt calculated from all shared expenses and settlements between these two users.</p>
            </div>
          </div>

          {/* Past Settlements */}
          {relevantSettlements.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Past Settlements</h3>
              <div className="space-y-2">
                {relevantSettlements.map((settlement) => {
                  if (settlement.type !== 'settlement') return null;
                  const isFromToTo = settlement.fromId === debt.from.id;
                  return (
                    <div key={settlement.id} className="flex justify-between items-center p-2 bg-green-500/10 rounded">
                      <span className="text-sm">
                        {isFromToTo 
                          ? `${formatName(debt.from.name)} → ${formatName(debt.to.name)}`
                          : `${formatName(debt.to.name)} → ${formatName(debt.from.name)}`
                        }
                      </span>
                      <div className="text-right">
                        <span className="font-medium text-green-600">{formatCurrency(settlement.amount)}</span>
                        <p className="text-xs text-muted-foreground">
                          {new Date(settlement.date).toLocaleDateString('en-IN', { 
                            month: 'short', 
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Current User Summary (if user is involved) */}
          {user && (user.uid === debt.from.id || user.uid === debt.to.id) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Your Position in This Debt</h3>
              <div className="space-y-2">
                <div className="flex justify-between p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <div>
                    <p className="text-sm font-medium">
                      {isCurrentUserDebtor ? "You owe" : "You are owed"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isCurrentUserDebtor 
                        ? `To ${formatName(debt.to.name)}`
                        : `By ${formatName(debt.from.name)}`
                      }
                    </p>
                  </div>
                  <span className={isCurrentUserDebtor ? "font-bold text-red-600 text-xl" : "font-bold text-green-600 text-xl"}>
                    {formatCurrency(debt.amount)}
                  </span>
                </div>
                {currentUserSettled > 0 && (
                  <div className="flex justify-between p-2 bg-green-500/10 rounded">
                    <span className="text-sm">Already settled:</span>
                    <span className="font-medium text-green-600">{formatCurrency(currentUserSettled)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Final Total */}
          <div className="border-t pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-accent/10 rounded-lg">
                <span className="font-semibold">Outstanding Amount:</span>
                <span className="text-2xl font-bold text-accent">{formatCurrency(debt.amount)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {formatName(debt.from.name)} owes {formatName(debt.to.name)}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                (After all expenses and settlements)
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


interface DebtCardProps {
  debt: Debt;
  onSettle: (debt: Debt, customAmount?: number) => void;
  transactions: Transaction[];
}

export function DebtCard({ debt, onSettle, transactions }: DebtCardProps) {
  const { from, to, amount } = debt;
  const { user } = useUser();
  const [customAmount, setCustomAmount] = useState<string>(amount.toFixed(2));
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  const formattedAmount = formatCurrency(amount);
  
  // Check if current user can settle this debt (they must be the one who owes)
  const canSettle = user?.uid === from.id;

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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 w-full">
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
        
        {/* View Details Button - shown to all users */}
        <ViewDebtDialog debt={debt} transactions={transactions} />
        
        {/* Settle Button - only shown to user who owes money */}
        {canSettle ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
               <Button 
                 variant="outline" 
                 className="w-full mt-2 hover:bg-primary/10 hover:text-primary hover:border-primary transition-all"
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
                  <Switcher1
                    checked={useCustomAmount}
                    onCheckedChange={setUseCustomAmount}
                    aria-label="Use custom amount"
                  />
                  <Label className="text-sm font-medium cursor-pointer" onClick={() => setUseCustomAmount(!useCustomAmount)}>
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
        ) : (
          <Button 
            variant="outline" 
            className="w-full mt-2 cursor-default opacity-60"
            disabled
          >
            <Clock className="mr-2 h-4 w-4" />
            Awaiting Payment
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
