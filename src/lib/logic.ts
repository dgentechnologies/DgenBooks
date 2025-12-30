import type { Transaction, User, Debt } from './types';

export function calculateBalances(transactions: Transaction[], users: User[]): { netBalances: Map<string, number>, debts: Debt[] } {
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
      const { paidById, amount, splitWith } = transaction;
      if (splitWith.length === 0) continue;
      
      // Skip transaction if paidById is not in users
      if (!userIds.has(paidById)) continue;
      
      const share = amount / splitWith.length;

      for (const participantId of splitWith) {
        if (participantId !== paidById && userIds.has(participantId)) {
          const participantBalance = balances.get(participantId);
          const currentOwedToPayer = participantBalance?.get(paidById);
          if (currentOwedToPayer !== undefined) {
            participantBalance!.set(paidById, currentOwedToPayer + share);
          }
        }
      }
    } else if (transaction.type === 'settlement') {
      const { fromId, toId, amount } = transaction;
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
