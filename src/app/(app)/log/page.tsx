'use client'

import React, { useState, useMemo } from 'react';
import type { Transaction } from '@/lib/types';
import { DataTable } from './data-table';
import { createColumns } from './columns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPurchases } from '@/hooks/use-purchases';
import { useUserSettlements } from '@/hooks/use-settlements';
import { useUsers } from '@/hooks/use-users';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function ExpenseLogPage() {
  const [filter, setFilter] = useState('all');
  const { user } = useUser();
  
  // Fetch purchases and settlements from Firebase
  const { data: purchases, isLoading: purchasesLoading } = useUserPurchases();
  const { data: settlements, isLoading: settlementsLoading } = useUserSettlements();
  const { users, isLoading: usersLoading } = useUsers();
  
  // Combine purchases and settlements into transactions
  // Filter out item-specific settlements (those with relatedExpenseId) to avoid duplication
  // These settlements are now represented by the visual state of their parent expense
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];
    if (purchases) {
      allTransactions.push(...purchases);
    }
    if (settlements) {
      // Only include settlements that are NOT linked to a specific expense
      // Linked settlements are shown via the expense's "PAID" status
      const generalSettlements = settlements.filter(s => !s.relatedExpenseId);
      allTransactions.push(...generalSettlements);
    }
    // Sort by date, most recent first
    return allTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchases, settlements]);

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') {
      return transactions;
    }
    
    if (filter === 'my-spending') {
      // Show only expenses paid by current user
      return transactions.filter(t => t.type === 'purchase' && t.paidById === user?.uid);
    }
    
    if (filter === 'involved') {
      // Show expenses where user is involved (in splitWith array)
      return transactions.filter(t => {
        if (t.type === 'purchase') {
          return t.splitWith.includes(user?.uid || '');
        }
        // For settlements, show if user is either sender or receiver
        return t.fromId === user?.uid || t.toId === user?.uid;
      });
    }
    
    return transactions;
  }, [transactions, filter, user]);
  
  // Create columns with Firebase users and settlements
  const columns = useMemo(() => createColumns(users, settlements || []), [users, settlements]);

  if (purchasesLoading || settlementsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Expense Log</h2>
          <p className="text-sm text-muted-foreground">View and manage all expenses</p>
        </div>
        <div className="w-full sm:w-auto overflow-x-auto scrollbar-hide pr-4">
          <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
            <TabsList className="inline-flex w-auto">
              <TabsTrigger value="all" className="text-sm whitespace-nowrap">All Expenses</TabsTrigger>
              <TabsTrigger value="my-spending" className="text-sm whitespace-nowrap">My Spending</TabsTrigger>
              <TabsTrigger value="involved" className="text-sm whitespace-nowrap">Involved In</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <div className="rounded-lg border bg-card card-hover">
        <DataTable columns={columns} data={filteredTransactions} users={users} />
      </div>
    </div>
  );
}
