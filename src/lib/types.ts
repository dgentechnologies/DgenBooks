export type User = {
  id: string;
  name: string;
  avatar: string;
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
