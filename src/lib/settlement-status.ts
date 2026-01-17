import type { Settlement, Purchase, Transaction } from './types';

/**
 * Settlement status for an expense
 */
export type SettlementStatus = {
  isFullyPaid: boolean;
  isPartiallyPaid: boolean;
  paidAmount: number;
  remainingAmount: number;
  shareAmount: number;
};

/**
 * Calculate the settlement status for a purchase from a specific debtor's perspective
 * @param purchase - The purchase transaction
 * @param debtorId - ID of the user who owes money
 * @param creditorId - ID of the user who is owed money
 * @param settlements - All settlement transactions
 * @returns Settlement status for this expense
 */
export function calculateSettlementStatus(
  purchase: Purchase,
  debtorId: string,
  creditorId: string,
  settlements: Settlement[]
): SettlementStatus {
  // Calculate the debtor's share of this expense
  const sharePerPerson = purchase.amount / purchase.splitWith.length;
  let shareAmount = 0;

  // Determine if this is a debit (debtor owes creditor) or credit (creditor owes debtor)
  if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
    const creditorPaid = purchase.paidByAmounts[creditorId] || 0;
    const debtorPaid = purchase.paidByAmounts[debtorId] || 0;

    // If creditor paid and debtor participated, debtor owes their share
    if (creditorPaid > 0 && purchase.splitWith.includes(debtorId) && debtorId !== creditorId) {
      shareAmount = creditorPaid / purchase.splitWith.length;
    }
  } else {
    // Single payer - if creditor paid and debtor participated, debtor owes their share
    if (purchase.paidById === creditorId && purchase.splitWith.includes(debtorId)) {
      shareAmount = sharePerPerson;
    }
  }

  // Find all settlements related to this specific expense
  const relatedSettlements = settlements.filter(
    s => s.relatedExpenseId === purchase.id &&
         s.fromId === debtorId &&
         s.toId === creditorId
  );

  // Calculate total paid amount for this expense
  const paidAmount = relatedSettlements.reduce((sum, s) => sum + s.amount, 0);
  const remainingAmount = Math.max(0, shareAmount - paidAmount);

  return {
    isFullyPaid: paidAmount >= shareAmount && shareAmount > 0,
    isPartiallyPaid: paidAmount > 0 && paidAmount < shareAmount,
    paidAmount,
    remainingAmount,
    shareAmount,
  };
}

/**
 * Create a map of settlements by related expense ID
 * @param settlements - All settlement transactions
 * @returns Map of expense ID to array of settlements
 */
export function createSettlementsByExpenseMap(
  settlements: Settlement[]
): Map<string, Settlement[]> {
  const map = new Map<string, Settlement[]>();

  settlements.forEach(settlement => {
    if (settlement.relatedExpenseId) {
      const existing = map.get(settlement.relatedExpenseId) || [];
      existing.push(settlement);
      map.set(settlement.relatedExpenseId, existing);
    }
  });

  return map;
}

/**
 * Determine if a transaction is a "green row" (credit transaction)
 * Green rows are expenses where the debtor paid for the creditor
 * These automatically reduce the debt and don't need a separate settlement
 * 
 * @param purchase - The purchase transaction
 * @param debtorId - ID of the user who owes money (in the debt relationship)
 * @param creditorId - ID of the user who is owed money (in the debt relationship)
 * @returns true if this is a credit transaction (green row)
 */
export function isCreditTransaction(
  purchase: Purchase,
  debtorId: string,
  creditorId: string
): boolean {
  if (purchase.paymentType === 'multiple' && purchase.paidByAmounts) {
    const debtorPaid = purchase.paidByAmounts[debtorId] || 0;
    const creditorPaid = purchase.paidByAmounts[creditorId] || 0;

    // This is a credit if debtor paid AND creditor participated (creditor owes debtor)
    // AND it's not a mixed payment where creditor also paid
    return debtorPaid > 0 && purchase.splitWith.includes(creditorId) && creditorPaid === 0;
  } else {
    // Single payer - this is a credit if debtor paid AND creditor participated
    return purchase.paidById === debtorId && purchase.splitWith.includes(creditorId);
  }
}
