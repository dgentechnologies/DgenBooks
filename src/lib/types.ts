export type User = {
  id: string;
  name: string;
  avatar: string;
  nickname?: string; // Optional nickname field for backwards compatibility
  email?: string; // Used for cross-project UID migration matching
  legacyUid?: string; // Previous Firebase UID from old project (set during post-migration login)
  fcmTokens?: string[]; // Array of FCM tokens for multi-device support
  lastTokenUpdate?: string; // ISO string of last token update
};

export type Category = {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  isDefault: boolean;
  createdAt: string; // ISO string
};

export type Purchase = {
  id: string;
  type: 'purchase';
  itemName: string;
  category: string;
  date: string; // ISO string
  amount: number;
  paidById: string; // For backward compatibility and single-payer expenses
  splitWith: string[]; // array of user IDs
  // New fields for multi-person payment support
  paymentType?: 'single' | 'multiple' | 'company'; // Optional for backward compatibility
  paidByAmounts?: Record<string, number>; // Map of userId to amount paid (for multiple payers)
  paidByCompany?: boolean; // Flag to indicate if expense is paid by company
};

export type Settlement = {
  id: string;
  type: 'settlement';
  fromId: string;
  toId: string;
  amount: number;
  date: string; // ISO string
  relatedExpenseId?: string; // Optional: Links to specific purchase if item-specific settlement
  description?: string; // Optional: Description of what was settled
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
  quantity?: number; // Optional quantity field, defaults to 1
  createdAt: string; // ISO string
  updatedAt?: string; // ISO string, optional
};
