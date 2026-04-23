import type { Transaction, User, Debt } from './types';

/**
 * Normalise a UID using the optional mapping that translates legacy UIDs (from a
 * previous Firebase project) to the corresponding current UIDs.
 */
function resolveUid(uid: string, uidMapping: Map<string, string>): string {
  return uidMapping.get(uid) ?? uid;
}

export function calculateBalances(
  transactions: Transaction[],
  users: User[],
  uidMapping: Map<string, string> = new Map()
): { netBalances: Map<string, number>, debts: Debt[] } {
  const balances = new Map<string, Map<string, number>>();
  const userIds = new Set(users.map(u => u.id));

  for (const user1 of users) {
    balances.set(user1.id, new Map());
    for (const user2 of users) {
      if (user1.id !== user2.id) {
        balances.get(user1.id)!.set(user2.id, 0);
      }
    }
  }

  for (const transaction of transactions) {
    if (transaction.type === 'purchase') {
      const { amount, splitWith, paymentType, paidByAmounts, paidByCompany } = transaction;
      // Resolve the single payer UID through the mapping (handles legacy UIDs)
      const paidById = resolveUid(transaction.paidById, uidMapping);
      
      // Skip company-paid expenses from balance calculations
      if (paidByCompany === true || paymentType === 'company') {
        continue;
      }
      
      if (splitWith.length === 0) continue;
      
      const share = amount / splitWith.length;

      // Handle multi-person payment
      if (paymentType === 'multiple' && paidByAmounts) {
        // For each payer, calculate what they're owed
        for (const [rawPayerId, amountPaid] of Object.entries(paidByAmounts)) {
          const payerId = resolveUid(rawPayerId, uidMapping);
          if (!userIds.has(payerId)) continue;
          
          // Calculate what this payer is owed from each participant
          for (const rawParticipantId of splitWith) {
            const participantId = resolveUid(rawParticipantId, uidMapping);
            if (participantId !== payerId && userIds.has(participantId)) {
              const participantBalance = balances.get(participantId);
              const currentOwedToPayer = participantBalance?.get(payerId);
              
              // Participant's share of what this payer paid
              const owedToThisPayer = amountPaid / splitWith.length;
              
              if (currentOwedToPayer !== undefined) {
                participantBalance!.set(payerId, currentOwedToPayer + owedToThisPayer);
              }
            }
          }
        }
      } else {
        // Handle single-person payment (original logic)
        // Skip transaction if paidById is not in users
        if (!userIds.has(paidById)) continue;

        for (const rawParticipantId of splitWith) {
          const participantId = resolveUid(rawParticipantId, uidMapping);
          if (participantId !== paidById && userIds.has(participantId)) {
            const participantBalance = balances.get(participantId);
            const currentOwedToPayer = participantBalance?.get(paidById);
            if (currentOwedToPayer !== undefined) {
              participantBalance!.set(paidById, currentOwedToPayer + share);
            }
          }
        }
      }
    } else if (transaction.type === 'settlement') {
      // Resolve both sides of the settlement through the UID mapping
      const fromId = resolveUid(transaction.fromId, uidMapping);
      const toId = resolveUid(transaction.toId, uidMapping);
      const { amount } = transaction;
      // Skip transaction if either user is not in users
      if (!userIds.has(fromId) || !userIds.has(toId)) continue;
      
      const fromBalance = balances.get(fromId);
      const currentOwed = fromBalance?.get(toId);
      if (currentOwed !== undefined) {
        fromBalance!.set(toId, currentOwed - amount);
      }
    }
  }

  const netBalances = new Map<string, number>();
  users.forEach(user => netBalances.set(user.id, 0));
  const debts: Debt[] = [];

  const userPairs = [];
  for (let i = 0; i < users.length; i++) {
    for (let j = i + 1; j < users.length; j++) {
      userPairs.push([users[i], users[j]]);
    }
  }

  for (const [user1, user2] of userPairs) {
    const u1OwesU2 = balances.get(user1.id)?.get(user2.id) || 0;
    const u2OwesU1 = balances.get(user2.id)?.get(user1.id) || 0;

    const netAmount = u1OwesU2 - u2OwesU1;

    if (netAmount > 0) {
      // user1 owes user2
      debts.push({ from: user1, to: user2, amount: netAmount });
      netBalances.set(user1.id, (netBalances.get(user1.id) ?? 0) - netAmount);
      netBalances.set(user2.id, (netBalances.get(user2.id) ?? 0) + netAmount);
    } else if (netAmount < 0) {
      // user2 owes user1
      debts.push({ from: user2, to: user1, amount: -netAmount });
      netBalances.set(user2.id, (netBalances.get(user2.id) ?? 0) - (-netAmount));
      netBalances.set(user1.id, (netBalances.get(user1.id) ?? 0) + (-netAmount));
    }
  }
  
  return { netBalances, debts };
}
