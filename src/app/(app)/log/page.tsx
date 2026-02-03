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
  
  // THREE-STEP PIPELINE for Visual Merging (Modified for Expense Log)
  // In the expense log, we want to show BOTH the crossed-out expense AND the settlement row
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];
    
    // Add all purchases
    if (purchases) {
      allTransactions.push(...purchases);
    }
    
    // Add all settlements (including those with relatedExpenseId)
    if (settlements) {
      allTransactions.push(...settlements);
    }
    
    // Sort by date, most recent first
    return allTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchases, settlements]);

  // STEP 1: Create a "Lookup Set" of all settled expense IDs
  // Force conversion to String to prevent type errors
  const settledExpenseIds = useMemo(() => {
    const ids = new Set(
      transactions
        .filter(t => t.type === 'settlement' && t.relatedExpenseId)
        .map(t => String(t.relatedExpenseId))
    );
    
    if (process.env.NODE_ENV === 'development' && ids.size > 0) {
      console.log('🔗 DEBUG: Settled IDs Found:', Array.from(ids));
    }
    
    return ids;
  }, [transactions]);

  // STEP 2: Mark Expense rows as settled (but don't filter out settlements)
  // In the expense log, we want to show both the expense AND the settlement
  const derivedTransactions = useMemo(() => {
    const derived = transactions.map(t => {
      // Mark Expense rows as settled if they have a linked settlement
      if (t.type === 'purchase' && settledExpenseIds.has(String(t.id))) {
        if (process.env.NODE_ENV === 'development') {
          console.log('✅ Marking expense as settled:', {
            expenseId: t.id,
            itemName: t.itemName,
          });
        }
        return { ...t, isSettled: true };
      }
      return t;
    });
    
    // Debug final results
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 Render Debug:', {
        totalRaw: transactions.length,
        settledSetSize: settledExpenseIds.size,
        derivedCount: derived.length,
        sampleSettled: derived.find(t => t.type === 'purchase' && (t as any).isSettled),
      });
    }
    
    return derived;
  }, [transactions, settledExpenseIds]);

  const filteredTransactions = useMemo(() => {
    // Apply user-specific filters to the derived transaction list
    if (filter === 'all') {
      return derivedTransactions;
    }
    
    if (filter === 'my-spending') {
      // Show only expenses paid by current user (exclude company-paid expenses)
      // Check both paidByCompany flag and paymentType for backward compatibility
      return derivedTransactions.filter(t => 
        t.type === 'purchase' && 
        t.paidById === user?.uid && 
        !(t.paidByCompany === true || t.paymentType === 'company')
      );
    }
    
    if (filter === 'involved') {
      // Show expenses where user is involved (in splitWith array)
      return derivedTransactions.filter(t => {
        if (t.type === 'purchase') {
          return t.splitWith.includes(user?.uid || '');
        }
        // For settlements, show if user is either sender or receiver
        return t.fromId === user?.uid || t.toId === user?.uid;
      });
    }
    
    return derivedTransactions;
  }, [derivedTransactions, filter, user]);
  
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
