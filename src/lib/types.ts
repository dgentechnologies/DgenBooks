export type User = {
  id: string;
  name: string;
  avatar: string;
  nickname?: string; // Optional nickname field for backwards compatibility
  fcmTokens?: string[]; // Array of FCM tokens for multi-device support
  lastTokenUpdate?: string; // ISO string of last token update
};

export type Purchase = {
  id: string;
  type: 'purchase';
  itemName: string;
  category: string;
  date: string; // ISO string
  amount: number;
  paidById: string;
  splitWith: string[]; // array of user IDs
};

export type Settlement = {
  id: string;
  type: 'settlement';
  fromId: string;
  toId: string;
  amount: number;
  date: string; // ISO string
};

export type Transaction = Purchase | Settlement;

export type Debt = {
  from: User;
  to: User;
  amount: number;
};

export type PurchaseRequest = {
  id: string;
  itemName: string;
  requestedBy: string; // User ID
  priority: 'Urgent' | 'Standard';
  status: 'Pending' | 'Purchased';
  estimatedCost?: number;
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string, optional
};
