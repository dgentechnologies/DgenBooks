import type { User, Transaction } from './types';

export const users: User[] = [
  { id: 'user1', name: 'Tirtha', avatar: 'https://picsum.photos/seed/1/40/40' },
  { id: 'user2', name: 'Suko', avatar: 'https://picsum.photos/seed/2/40/40' },
  { id: 'user3', name: 'Arpan', avatar: 'https://picsum.photos/seed/3/40/40' },
  { id: 'user4', name: 'Sagnik', avatar: 'https://picsum.photos/seed/4/40/40' },
];

export const currentUser = users[0];

export const initialTransactions: Transaction[] = [
  {
    id: 'txn1',
    type: 'purchase',
    itemName: 'Team Lunch',
    category: 'Food',
    date: '2024-07-20T12:00:00Z',
    amount: 2000,
    paidById: 'user1', // Tirtha
    splitWith: ['user1', 'user2', 'user3', 'user4'],
  },
  {
    id: 'txn2',
    type: 'purchase',
    itemName: 'Server Hosting Bill',
    category: 'Software',
    date: '2024-07-19T10:00:00Z',
    amount: 5000,
    paidById: 'user2', // Suko
    splitWith: ['user1', 'user2', 'user3', 'user4'],
  },
  {
    id: 'txn3',
    type: 'purchase',
    itemName: 'Client Dinner',
    category: 'Business',
    date: '2024-07-18T19:30:00Z',
    amount: 3000,
    paidById: 'user1', // Tirtha
    splitWith: ['user1', 'user2'],
  },
  {
    id: 'txn4',
    type: 'settlement',
    fromId: 'user3', // Arpan
    toId: 'user2',   // Suko
    amount: 1250,
    date: '2024-07-21T09:00:00Z',
  },
    {
    id: 'txn5',
    type: 'purchase',
    itemName: 'Snacks for Office',
    category: 'Food',
    date: '2024-07-22T15:00:00Z',
    amount: 800,
    paidById: 'user4', // Sagnik
    splitWith: ['user1', 'user2', 'user3', 'user4'],
  },
];
