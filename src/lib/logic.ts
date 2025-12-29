import type { Transaction, User, Debt } from './types';
import { users } from './data';

export function calculateBalances(transactions: Transaction[]): { netBalances: Map<string, number>, debts: Debt[] } {
  const balances = new Map<string, Map<string, number>>();

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
      
      const share = amount / splitWith.length;

      for (const participantId of splitWith) {
        if (participantId !== paidById) {
          const currentOwed = balances.get(participantId)!.get(paidById)!;
          balances.get(participantId)!.set(paidById, currentOwed + share);
        }
      }
    } else if (transaction.type === 'settlement') {
      const { fromId, toId, amount } = transaction;
      const currentOwed = balances.get(fromId)!.get(toId)!;
      balances.get(fromId)!.set(toId, currentOwed - amount);
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
      netBalances.set(user1.id, netBalances.get(user1.id)! - netAmount);
      netBalances.set(user2.id, netBalances.get(user2.id)! + netAmount);
    } else if (netAmount < 0) {
      // user2 owes user1
      debts.push({ from: user2, to: user1, amount: -netAmount });
      netBalances.set(user2.id, netBalances.get(user2.id)! - (-netAmount));
      netBalances.set(user1.id, netBalances.get(user1.id)! + (-netAmount));
    }
  }
  
  return { netBalances, debts };
}
