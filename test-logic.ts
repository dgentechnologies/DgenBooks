// Test script for multi-payer settlement calculation
// Run this to verify the logic works correctly

import { calculateBalances } from './src/lib/logic';
import type { Transaction, User } from './src/lib/types';

// Mock users
const users: User[] = [
  { id: 'user1', name: 'John', avatar: '', nickname: 'J' },
  { id: 'user2', name: 'Emma', avatar: '', nickname: 'E' },
  { id: 'user3', name: 'Sarah', avatar: '', nickname: 'S' },
];

console.log('=== Test 1: Single Payment (Backward Compatibility) ===');
const test1: Transaction[] = [
  {
    id: '1',
    type: 'purchase',
    itemName: 'Team Lunch',
    category: 'Food',
    date: '2026-01-08',
    amount: 600,
    paidById: 'user1',
    splitWith: ['user1', 'user2', 'user3'],
  }
];
const result1 = calculateBalances(test1, users);
console.log('Net Balances:', result1.netBalances);
console.log('Debts:', result1.debts);
console.log('Expected: John +400, Emma -200, Sarah -200\n');

console.log('=== Test 2: Multiple Payments with Equal Split ===');
const test2: Transaction[] = [
  {
    id: '2',
    type: 'purchase',
    itemName: 'Dinner',
    category: 'Food',
    date: '2026-01-08',
    amount: 900,
    paymentType: 'multiple',
    paidById: 'user1',
    paidByAmounts: {
      'user1': 500,
      'user2': 400,
    },
    splitWith: ['user1', 'user2', 'user3'],
  }
];
const result2 = calculateBalances(test2, users);
console.log('Net Balances:', result2.netBalances);
console.log('Debts:', result2.debts);
console.log('Expected: John +200 (paid 500, owes 300), Emma +100 (paid 400, owes 300), Sarah -300\n');

console.log('=== Test 3: Multiple Payments with Custom Split ===');
const test3: Transaction[] = [
  {
    id: '3',
    type: 'purchase',
    itemName: 'Movie Tickets',
    category: 'Entertainment',
    date: '2026-01-08',
    amount: 800,
    paymentType: 'multiple',
    paidById: 'user1',
    paidByAmounts: {
      'user1': 500,
      'user2': 300,
    },
    splitWith: ['user1', 'user2'], // Only 2 people
  }
];
const result3 = calculateBalances(test3, users);
console.log('Net Balances:', result3.netBalances);
console.log('Debts:', result3.debts);
console.log('Expected: John +100 (paid 500, owes 400), Emma -100 (paid 300, owes 400), Sarah 0\n');

console.log('=== Test 4: Mixed - Single and Multiple Payments ===');
const test4: Transaction[] = [
  {
    id: '4a',
    type: 'purchase',
    itemName: 'Coffee',
    category: 'Food',
    date: '2026-01-08',
    amount: 300,
    paidById: 'user1',
    splitWith: ['user1', 'user2', 'user3'],
  },
  {
    id: '4b',
    type: 'purchase',
    itemName: 'Groceries',
    category: 'Shopping',
    date: '2026-01-08',
    amount: 600,
    paymentType: 'multiple',
    paidById: 'user1',
    paidByAmounts: {
      'user2': 400,
      'user3': 200,
    },
    splitWith: ['user1', 'user2', 'user3'],
  }
];
const result4 = calculateBalances(test4, users);
console.log('Net Balances:', result4.netBalances);
console.log('Debts:', result4.debts);
console.log('Expected:');
console.log('  - Coffee: John paid 300, each owes 100');
console.log('  - Groceries: Emma paid 400, Sarah paid 200, each owes 200');
console.log('  - John: +200 (paid 300, received 400-200 from groceries, owes 100+200)');
console.log('  - Emma: 0 (owes 100 from coffee, paid 400 for groceries which is +200)');
console.log('  - Sarah: -200 (owes 100 from coffee, paid 200 for groceries which is 0)\n');

console.log('=== Test 5: With Settlement ===');
const test5: Transaction[] = [
  {
    id: '5a',
    type: 'purchase',
    itemName: 'Dinner',
    category: 'Food',
    date: '2026-01-08',
    amount: 900,
    paymentType: 'multiple',
    paidById: 'user1',
    paidByAmounts: {
      'user1': 500,
      'user2': 400,
    },
    splitWith: ['user1', 'user2', 'user3'],
  },
  {
    id: '5b',
    type: 'settlement',
    fromId: 'user3',
    toId: 'user1',
    amount: 200,
    date: '2026-01-08',
  }
];
const result5 = calculateBalances(test5, users);
console.log('Net Balances:', result5.netBalances);
console.log('Debts:', result5.debts);
console.log('Expected: After Sarah settles 200 with John:');
console.log('  - John: 0 (was +200 from dinner, received 200 from Sarah)');
console.log('  - Emma: +100 (paid extra 100 in dinner)');
console.log('  - Sarah: -100 (still owes 100 to Emma after settling with John)\n');

console.log('\n✅ All test scenarios defined. Run with: npx tsx test-logic.ts');
