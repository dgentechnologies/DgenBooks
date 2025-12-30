'use client'

import React, { useState, useMemo } from 'react';
import type { Transaction } from '@/lib/types';
import { DataTable } from './data-table';
import { columns } from './columns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUserPurchases } from '@/hooks/use-purchases';
import { useUserSettlements } from '@/hooks/use-settlements';
import { useUser } from '@/firebase';
import { Loader2 } from 'lucide-react';

export default function ExpenseLogPage() {
  const [filter, setFilter] = useState('all');
  const { user } = useUser();
  
  // Fetch purchases and settlements from Firebase
  const { data: purchases, isLoading: purchasesLoading } = useUserPurchases();
  const { data: settlements, isLoading: settlementsLoading } = useUserSettlements();
  
  // Combine purchases and settlements into transactions
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];
    if (purchases) {
      allTransactions.push(...purchases);
    }
    if (settlements) {
      allTransactions.push(...settlements);
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

  if (purchasesLoading || settlementsLoading) {
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
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-3">
            <TabsTrigger value="all" className="text-sm">All Expenses</TabsTrigger>
            <TabsTrigger value="my-spending" className="text-sm">My Spending</TabsTrigger>
            <TabsTrigger value="involved" className="text-sm">Involved In</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="rounded-lg border bg-card card-hover">
        <DataTable columns={columns} data={filteredTransactions} />
      </div>
    </div>
  );
}
