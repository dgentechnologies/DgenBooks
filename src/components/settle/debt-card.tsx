import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ArrowRight, Handshake, Eye, Clock, Receipt } from "lucide-react";
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
import { PaymentConfirmationModal } from "@/components/payment-confirmation-modal"

/**
 * Helper function to get payment amounts for a purchase
 * @param purchase - The purchase transaction
 * @param debtorId - ID of the user who owes money (debt.from.id)
 * @param creditorId - ID of the user who is owed money (debt.to.id)
 * @returns Object containing expenseFromPaid (amount paid by debtor) and expenseToPaid (amount paid by creditor)
 */
function getPaymentAmounts(purchase: Purchase, debtorId: string, creditorId: string) {
  let expenseFromPaid = 0;
  let expenseToPaid = 0;
  
  if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
    expenseFromPaid = purchase.paidByAmounts[debtorId] || 0;
    expenseToPaid = purchase.paidByAmounts[creditorId] || 0;
  } else {
    if (purchase.paidById === debtorId) {
      expenseFromPaid = purchase.amount;
    } else if (purchase.paidById === creditorId) {
      expenseToPaid = purchase.amount;
    }
  }
  
  return { expenseFromPaid, expenseToPaid };
}

/**
 * Helper function to determine transaction type based on who paid and who owes
 * @param expenseFromPaid - Amount paid by the debtor
 * @param expenseToPaid - Amount paid by the creditor
 * @param fromShare - Debtor's share of the expense
 * @param toShare - Creditor's share of the expense
 * @returns Transaction type:
 *   - 'debit': Creditor paid, debtor owes (increases debt) - Red entry
 *   - 'credit': Debtor paid, creditor owes (decreases debt) - Green entry
 *   - 'mixed': Both paid (net effect on debt) - Blue entry
 *   - 'third-party': Neither user paid (should be filtered out)
 */
function getTransactionType(
  expenseFromPaid: number,
  expenseToPaid: number,
  fromShare: number,
  toShare: number
): 'debit' | 'credit' | 'mixed' | 'third-party' {
  const creditorPaidForDebtor = expenseToPaid > 0 && fromShare > 0;
  const debtorPaidForCreditor = expenseFromPaid > 0 && toShare > 0;
  
  // If neither user paid (third party), mark as third-party
  if (expenseFromPaid === 0 && expenseToPaid === 0) {
    return 'third-party';
  }
  
  if (creditorPaidForDebtor && !debtorPaidForCreditor) {
    return 'debit'; // Red: Creditor paid, Debtor owes
  } else if (debtorPaidForCreditor && !creditorPaidForDebtor) {
    return 'credit'; // Green: Debtor paid, Creditor owes
  } else if (creditorPaidForDebtor && debtorPaidForCreditor) {
    return 'mixed'; // Blue: Both paid
  }
  
  return 'third-party';
}

/**
 * Helper function to calculate debt or credit totals from a list of purchases
 * Uses the same per-payer logic as calculatedOutstanding to ensure consistency
 * @param purchases - Array of purchase transactions
 * @param debtorId - ID of the user who owes money
 * @param creditorId - ID of the user who is owed money
 * @param type - Type of calculation: 'debt' for red entries, 'credit' for green entries
 * @returns Total amount for the specified type
 */
function calculateTotal(
  purchases: Purchase[],
  debtorId: string,
  creditorId: string,
  type: 'debt' | 'credit'
): number {
  return purchases.reduce((sum, p) => {
    const sharePerPerson = p.amount / p.splitWith.length;
    
    let debtorOwesToCreditor = 0;
    let creditorOwesToDebtor = 0;
    
    if (p.paymentType === 'multiple' && p.paidByAmounts) {
      // Multi-payer: Calculate what each participant owes to each payer
      const creditorPaid = p.paidByAmounts[creditorId] || 0;
      if (creditorPaid > 0 && p.splitWith.includes(debtorId) && debtorId !== creditorId) {
        debtorOwesToCreditor = creditorPaid / p.splitWith.length;
      }
      
      const debtorPaid = p.paidByAmounts[debtorId] || 0;
      if (debtorPaid > 0 && p.splitWith.includes(creditorId) && debtorId !== creditorId) {
        creditorOwesToDebtor = debtorPaid / p.splitWith.length;
      }
    } else {
      // Single payer
      if (p.paidById === creditorId && p.splitWith.includes(debtorId)) {
        debtorOwesToCreditor = sharePerPerson;
      } else if (p.paidById === debtorId && p.splitWith.includes(creditorId)) {
        creditorOwesToDebtor = sharePerPerson;
      }
    }
    
    const { expenseFromPaid, expenseToPaid } = getPaymentAmounts(p, debtorId, creditorId);
    const transactionType = getTransactionType(expenseFromPaid, expenseToPaid, debtorOwesToCreditor, creditorOwesToDebtor);
    
    if (type === 'debt') {
      // Pure debit transactions (creditor paid, debtor owes)
      if (transactionType === 'debit') {
        return sum + debtorOwesToCreditor;
      }
      // For mixed transactions, add net positive effect
      if (transactionType === 'mixed') {
        const netEffect = debtorOwesToCreditor - creditorOwesToDebtor;
        if (netEffect > 0) {
          return sum + netEffect;
        }
      }
    } else {
      // Pure credit transactions (debtor paid, creditor owes)
      if (transactionType === 'credit') {
        return sum + creditorOwesToDebtor;
      }
      // For mixed transactions, add net negative effect (as positive credit)
      if (transactionType === 'mixed') {
        const netEffect = debtorOwesToCreditor - creditorOwesToDebtor;
        if (netEffect < 0) {
          return sum + Math.abs(netEffect);
        }
      }
    }
    
    return sum;
  }, 0);
}


// View debt details dialog component
function ViewDebtDialog({ debt, transactions, onSettleExpense }: { debt: Debt; transactions: Transaction[]; onSettleExpense?: (expenseId: string, amount: number, itemName: string, fromId: string, toId: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useUser();
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<{
    id: string;
    itemName: string;
    shareAmount: number;
    fromId: string;
    toId: string;
  } | null>(null);

  // Get all purchases related to this debt - BOTH sides of the ledger
  // Type A (Debits/Red): Creditor paid, Debtor participated → increases debt
  // Type B (Credits/Green): Debtor paid, Creditor participated → decreases debt
  const relevantPurchases = useMemo(() => {
    return transactions.filter((t): t is Purchase => {
      if (t.type !== 'purchase') return false;
      
      // Check if both users participated in the expense
      const debtorParticipated = t.splitWith.includes(debt.from.id);
      const creditorParticipated = t.splitWith.includes(debt.to.id);
      
      // Check who paid for the expense
      const creditorPaid = t.paymentType === 'multiple' 
        ? !!(t.paidByAmounts && t.paidByAmounts[debt.to.id] && t.paidByAmounts[debt.to.id] > 0)
        : t.paidById === debt.to.id;
      
      const debtorPaid = t.paymentType === 'multiple'
        ? !!(t.paidByAmounts && t.paidByAmounts[debt.from.id] && t.paidByAmounts[debt.from.id] > 0)
        : t.paidById === debt.from.id;
      
      // Include if:
      // - Creditor paid AND debtor participated (Type A - Debit)
      // - Debtor paid AND creditor participated (Type B - Credit)
      return (creditorPaid && debtorParticipated) || (debtorPaid && creditorParticipated);
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

  // Combine purchases and settlements, then sort by date (newest first)
  const allTransactions = useMemo(() => {
    const combined = [
      ...relevantPurchases.map(p => ({ ...p, sortDate: new Date(p.date).getTime() })),
      ...relevantSettlements.map(s => ({ ...s, sortDate: new Date(s.date).getTime() }))
    ];
    return combined.sort((a, b) => b.sortDate - a.sortDate);
  }, [relevantPurchases, relevantSettlements]);

  // Client-side reconciliation: Calculate the actual outstanding amount from visible transactions
  const calculatedOutstanding = useMemo(() => {
    let debtorOwesCreditor = 0; // How much debtor owes to creditor
    
    // Process all purchases
    relevantPurchases.forEach((purchase) => {
      const sharePerPerson = purchase.amount / purchase.splitWith.length;
      
      if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
        // Multi-payer: Calculate what each participant owes to each payer
        // This follows the same logic as src/lib/logic.ts
        
        // For the creditor: if they paid, calculate what the debtor owes them
        const creditorPaid = purchase.paidByAmounts[debt.to.id] || 0;
        if (creditorPaid > 0 && purchase.splitWith.includes(debt.from.id) && debt.from.id !== debt.to.id) {
          // Debtor owes creditor their share of what creditor paid
          // Share = (amount creditor paid) / (number of people splitting)
          const debtorShareOfCreditorPayment = creditorPaid / purchase.splitWith.length;
          debtorOwesCreditor += debtorShareOfCreditorPayment;
        }
        
        // For the debtor: if they paid, calculate what the creditor owes them (reduces debt)
        const debtorPaid = purchase.paidByAmounts[debt.from.id] || 0;
        if (debtorPaid > 0 && purchase.splitWith.includes(debt.to.id) && debt.from.id !== debt.to.id) {
          // Creditor owes debtor their share of what debtor paid
          // This reduces the overall debt from debtor to creditor
          const creditorShareOfDebtorPayment = debtorPaid / purchase.splitWith.length;
          debtorOwesCreditor -= creditorShareOfDebtorPayment;
        }
      } else {
        // Single payer
        if (purchase.paidById === debt.to.id && purchase.splitWith.includes(debt.from.id)) {
          // Creditor paid, debtor participated → debt increases
          debtorOwesCreditor += sharePerPerson;
        } else if (purchase.paidById === debt.from.id && purchase.splitWith.includes(debt.to.id)) {
          // Debtor paid, creditor participated → debt decreases
          debtorOwesCreditor -= sharePerPerson;
        }
      }
    });
    
    // Process all settlements
    relevantSettlements.forEach((settlement) => {
      if (settlement.type === 'settlement') {
        if (settlement.fromId === debt.from.id && settlement.toId === debt.to.id) {
          // Debtor paid to creditor → debt decreases
          debtorOwesCreditor -= settlement.amount;
        } else if (settlement.fromId === debt.to.id && settlement.toId === debt.from.id) {
          // Creditor paid to debtor → debt increases (unusual but possible)
          debtorOwesCreditor += settlement.amount;
        }
      }
    });
    
    return Math.max(0, debtorOwesCreditor); // Can't have negative debt
  }, [relevantPurchases, relevantSettlements, debt]);

  // Handler to open payment modal for a specific expense
  const handleSettleExpenseClick = (
    expenseId: string,
    itemName: string,
    shareAmount: number,
    fromId: string,
    toId: string
  ) => {
    setSelectedExpense({
      id: expenseId,
      itemName,
      shareAmount,
      fromId,
      toId,
    });
    setPaymentModalOpen(true);
  };

  // Handler to confirm payment
  const handleConfirmPayment = (amount: number) => {
    if (selectedExpense && onSettleExpense) {
      onSettleExpense(
        selectedExpense.id,
        amount,
        selectedExpense.itemName,
        selectedExpense.fromId,
        selectedExpense.toId
      );
      setSelectedExpense(null);
    }
  };

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
          <DialogTitle className="font-headline text-xl">Settlement Breakdown</DialogTitle>
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
                <p className="text-xl font-bold text-primary">{formatCurrency(calculatedOutstanding)}</p>
              </div>
              <Avatar className="h-10 w-10">
                <AvatarImage src={debt.to.avatar} />
                <AvatarFallback>{debt.to.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </div>

          {/* Ledger: Debits, Credits, and Settlements */}
          {allTransactions.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Transaction Ledger</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Showing all transactions between {formatName(debt.from.name)} and {formatName(debt.to.name)}
              </p>
              <div className="space-y-3">
                {allTransactions.map((transaction) => {
                  // Handle Purchase transactions
                  if (transaction.type === 'purchase') {
                    const purchase = transaction as Purchase;
                  const CategoryIcon = getCategoryIcon(purchase.category);
                  const sharePerPerson = purchase.amount / purchase.splitWith.length;
                  
                  // Calculate payment amounts and shares
                  const { expenseFromPaid, expenseToPaid } = getPaymentAmounts(purchase, debt.from.id, debt.to.id);
                  
                  // For multi-payer, calculate the SPECIFIC debt between these two users
                  let debtorOwesToCreditor = 0; // What debtor owes creditor for THIS transaction
                  let creditorOwesToDebtor = 0; // What creditor owes debtor for THIS transaction
                  
                  if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
                    // If creditor paid, calculate what debtor owes creditor
                    if (expenseToPaid > 0 && purchase.splitWith.includes(debt.from.id) && debt.from.id !== debt.to.id) {
                      debtorOwesToCreditor = expenseToPaid / purchase.splitWith.length;
                    }
                    // If debtor paid, calculate what creditor owes debtor
                    if (expenseFromPaid > 0 && purchase.splitWith.includes(debt.to.id) && debt.from.id !== debt.to.id) {
                      creditorOwesToDebtor = expenseFromPaid / purchase.splitWith.length;
                    }
                  } else {
                    // Single payer scenario
                    if (purchase.paidById === debt.to.id && purchase.splitWith.includes(debt.from.id)) {
                      debtorOwesToCreditor = sharePerPerson;
                    } else if (purchase.paidById === debt.from.id && purchase.splitWith.includes(debt.to.id)) {
                      creditorOwesToDebtor = sharePerPerson;
                    }
                  }
                  
                  // Determine transaction type using helper
                  const transactionType = getTransactionType(expenseFromPaid, expenseToPaid, debtorOwesToCreditor, creditorOwesToDebtor);
                  
                  // Skip third-party transactions
                  if (transactionType === 'third-party') {
                    return null;
                  }
                  // Determine display properties based on transaction type
                  let bgColor, borderColor, textColor, label, shareAmount;
                  if (transactionType === 'debit') {
                    // Red entry: Debt increases
                    bgColor = 'bg-red-500/5';
                    borderColor = 'border-red-500/20';
                    textColor = 'text-red-600';
                    label = `Paid by ${formatName(debt.to.name)}`;
                    shareAmount = debtorOwesToCreditor; // What debtor owes creditor
                  } else if (transactionType === 'credit') {
                    // Green entry: Debt decreases
                    bgColor = 'bg-green-500/5';
                    borderColor = 'border-green-500/20';
                    textColor = 'text-green-600';
                    label = `Paid by ${formatName(debt.from.name)}`;
                    shareAmount = creditorOwesToDebtor; // What creditor owes debtor (reduces debt)
                  } else {
                    // Mixed: Both paid - show net effect
                    bgColor = 'bg-blue-500/5';
                    borderColor = 'border-blue-500/20';
                    textColor = 'text-blue-600';
                    label = `Paid by both`;
                    shareAmount = debtorOwesToCreditor - creditorOwesToDebtor; // Net effect on debt (positive increases, negative decreases)
                  }
                  
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
                          <p className="text-xs font-medium text-primary mt-1">{label}</p>
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
                      
                      {/* Share Display - Color Coded */}
                      <div className="pt-2 border-t">
                        <div className={`${bgColor} rounded p-2 border ${borderColor}`}>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="font-medium">
                              {transactionType === 'debit' && `${formatName(debt.from.name)}'s Share:`}
                              {transactionType === 'credit' && `${formatName(debt.to.name)}'s Share:`}
                              {transactionType === 'mixed' && `Net Impact on Debt:`}
                            </div>
                            <div className={`text-right font-semibold ${textColor}`}>
                              {transactionType === 'debit' && `+${formatCurrency(shareAmount)}`}
                              {transactionType === 'credit' && `-${formatCurrency(shareAmount)}`}
                              {transactionType === 'mixed' && (shareAmount >= 0 ? `+${formatCurrency(shareAmount)}` : `-${formatCurrency(Math.abs(shareAmount))}`)}
                            </div>
                          </div>
                          {transactionType === 'mixed' && (
                            <div className="mt-2 pt-2 border-t border-dashed border-muted-foreground/20 text-xs text-muted-foreground">
                              <div className="flex justify-between">
                                <span>{formatName(debt.from.name)} paid:</span>
                                <span>{formatCurrency(expenseFromPaid)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{formatName(debt.to.name)} paid:</span>
                                <span>{formatCurrency(expenseToPaid)}</span>
                              </div>
                              <div className="flex justify-between mt-1 pt-1 border-t border-dashed">
                                <span>{formatName(debt.from.name)} owes {formatName(debt.to.name)}:</span>
                                <span>{formatCurrency(debtorOwesToCreditor)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>{formatName(debt.to.name)} owes {formatName(debt.from.name)}:</span>
                                <span>{formatCurrency(creditorOwesToDebtor)}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Settle Button - Conditional based on transaction type */}
                      {onSettleExpense && Math.abs(shareAmount) > 0 && (
                        <div className="pt-2 border-t mt-2">
                          {transactionType === 'credit' ? (
                            // Green Row: Show "Auto-deducted" label instead of settle button
                            <div className="text-xs text-green-600 text-center py-2 bg-green-500/5 rounded">
                              ✓ Auto-deducted from total outstanding
                            </div>
                          ) : (
                            // Red/Mixed Row: Show settle button
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs hover:bg-primary/10 hover:text-primary"
                              onClick={() => handleSettleExpenseClick(
                                purchase.id,
                                purchase.itemName,
                                Math.abs(shareAmount),
                                debt.from.id,
                                debt.to.id
                              )}
                            >
                              <Receipt className="mr-1.5 h-3.5 w-3.5" />
                              Settle This Item
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    );
                  }
                  
                  // Handle Settlement transactions
                  if (transaction.type === 'settlement') {
                    const settlement = transaction;
                    
                    // Settlement from debtor to creditor reduces the debt
                    const isFromDebtorToCreditor = settlement.fromId === debt.from.id && settlement.toId === debt.to.id;
                    
                    return (
                      <div key={settlement.id} className="border rounded-lg p-3 bg-muted/30">
                        {/* Settlement Header */}
                        <div className="flex items-start gap-2 mb-3">
                          <div className="rounded-full p-1.5 bg-green-500/10 flex-shrink-0 mt-0.5">
                            <Handshake className="h-3 w-3 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">
                              {isFromDebtorToCreditor ? 'Payment Received' : 'Payment Made'}
                            </p>
                            <p className="text-xs text-muted-foreground">Settlement</p>
                            <p className="text-xs font-medium text-primary mt-1">
                              {formatName(settlement.fromId === debt.from.id ? debt.from.name : debt.to.name)} → {formatName(settlement.toId === debt.from.id ? debt.from.name : debt.to.name)}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {new Date(settlement.date).toLocaleDateString('en-IN', { 
                                month: 'short', 
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-semibold text-sm">{formatCurrency(settlement.amount)}</p>
                            <p className="text-xs text-muted-foreground">Amount</p>
                          </div>
                        </div>
                        
                        {/* Settlement Display - Always Green (reduces debt) */}
                        <div className="pt-2 border-t">
                          <div className="bg-green-500/5 rounded p-2 border border-green-500/20">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="font-medium">Settlement Credit:</div>
                              <div className="text-right font-semibold text-green-600">
                                -{formatCurrency(settlement.amount)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  
                  return null;
                })}
              </div>
            </div>
          )}

          {/* Settlement Calculation */}
          <div>
            <h3 className="font-semibold mb-3">Net Debt Calculation</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Calculated from all visible transactions
            </p>
            <div className="space-y-2 mb-3 text-sm">
              <div className="flex justify-between p-2 bg-red-500/5 rounded">
                <span className="text-muted-foreground">Total Debt (Red entries):</span>
                <span className="font-semibold text-red-600">
                  +{formatCurrency(calculateTotal(relevantPurchases, debt.from.id, debt.to.id, 'debt'))}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-green-500/5 rounded">
                <span className="text-muted-foreground">Total Credit (Green entries):</span>
                <span className="font-semibold text-green-600">
                  -{formatCurrency(calculateTotal(relevantPurchases, debt.from.id, debt.to.id, 'credit'))}
                </span>
              </div>
              <div className="flex justify-between p-2 bg-green-500/5 rounded">
                <span className="text-muted-foreground">Settlements Paid:</span>
                <span className="font-semibold text-green-600">
                  -{formatCurrency(
                    relevantSettlements.reduce((sum, s) => {
                      if (s.type !== 'settlement') return sum;
                      // Settlements from debtor to creditor reduce the debt
                      if (s.fromId === debt.from.id && s.toId === debt.to.id) {
                        return sum + s.amount;
                      }
                      return sum;
                    }, 0)
                  )}
                </span>
              </div>
            </div>
            <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Calculated Outstanding</p>
                  <p className="text-lg font-semibold mt-1">
                    {formatName(debt.from.name)} → {formatName(debt.to.name)}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-bold text-accent">{formatCurrency(calculatedOutstanding)}</span>
                </div>
              </div>
            </div>
            
            <div className="mt-3 p-2 bg-blue-500/5 rounded text-xs text-muted-foreground">
              <p>💡 Net Debt = Total Debt (Red) - Total Credit (Green) - Settlements Paid</p>
            </div>
          </div>

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
                    {formatCurrency(calculatedOutstanding)}
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
                <span className="font-semibold">Calculated Outstanding:</span>
                <span className="text-2xl font-bold text-accent">{formatCurrency(calculatedOutstanding)}</span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                {formatName(debt.from.name)} owes {formatName(debt.to.name)}
              </p>
              <p className="text-xs text-muted-foreground text-center">
                (Calculated from all visible transactions)
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
      
      {/* Payment Confirmation Modal */}
      {selectedExpense && (
        <PaymentConfirmationModal
          isOpen={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          itemName={selectedExpense.itemName}
          shareAmount={selectedExpense.shareAmount}
          onConfirm={handleConfirmPayment}
          payerName={user?.uid === selectedExpense.fromId ? formatName(debt.from.name) : formatName(debt.to.name)}
          recipientName={user?.uid === selectedExpense.fromId ? formatName(debt.to.name) : formatName(debt.from.name)}
        />
      )}
    </Dialog>
  );
}


interface DebtCardProps {
  debt: Debt;
  onSettle: (debt: Debt, customAmount?: number) => void;
  transactions: Transaction[];
  onSettleExpense?: (expenseId: string, amount: number, itemName: string, fromId: string, toId: string) => void;
}

export function DebtCard({ debt, onSettle, transactions, onSettleExpense }: DebtCardProps) {
  const { from, to, amount } = debt;
  const { user } = useUser();
  const [customAmount, setCustomAmount] = useState<string>(amount.toFixed(2));
  const [useCustomAmount, setUseCustomAmount] = useState(false);

  const formattedAmount = formatCurrency(amount);
  
  // Check if current user is involved in this debt (either debtor or creditor)
  const canSettle = user?.uid === from.id || user?.uid === to.id;
  const isDebtor = user?.uid === from.id;

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
        <ViewDebtDialog debt={debt} transactions={transactions} onSettleExpense={onSettleExpense} />
        
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
