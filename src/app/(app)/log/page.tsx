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
    
    // Add all purchases
    if (purchases) {
      allTransactions.push(...purchases);
    }
    
    // Add only settlements that are NOT linked to a specific expense
    // This prevents visual duplication where a settled item appears twice
    if (settlements) {
      // Create a Set of expense IDs that have related settlements (for debugging)
      const settledExpenseIds = new Set(
        settlements
          .filter(s => s.relatedExpenseId) // Only settlements with related expense
          .map(s => String(s.relatedExpenseId)) // Force string cast for consistency
      );
      
      // Debug logging to verify the filtering is working
      if (process.env.NODE_ENV === 'development' && settledExpenseIds.size > 0) {
        console.log('🔗 Settlement Link Debug:', {
          totalSettlements: settlements.length,
          linkedSettlements: settledExpenseIds.size,
          settledExpenseIds: Array.from(settledExpenseIds),
        });
      }
      
      // Filter: Only include settlements WITHOUT a relatedExpenseId
      // These are general debt settlements, not item-specific ones
      const generalSettlements = settlements.filter(s => {
        const hasRelatedId = !!s.relatedExpenseId;
        
        // Debug individual settlement filtering
        if (process.env.NODE_ENV === 'development' && hasRelatedId) {
          console.log('🚫 Filtering out linked settlement:', {
            settlementId: s.id,
            relatedExpenseId: s.relatedExpenseId,
            type: typeof s.relatedExpenseId,
          });
        }
        
        // Return true ONLY if there's NO relatedExpenseId
        return !hasRelatedId;
      });
      
      allTransactions.push(...generalSettlements);
      
      // Debug final counts
      if (process.env.NODE_ENV === 'development') {
        console.log('📊 Transaction List Stats:', {
          purchases: purchases?.length || 0,
          totalSettlements: settlements.length,
          filteredSettlements: generalSettlements.length,
          finalTransactionCount: allTransactions.length,
        });
      }
    }
    
    // Sort by date, most recent first
    return allTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchases, settlements]);

  const filteredTransactions = useMemo(() => {
    // Additional safety filter: Remove any settlements with relatedExpenseId that might have slipped through
    // This is a defensive measure to ensure visual duplication never occurs
    let baseTransactions = transactions.filter(t => {
      // If it's a settlement with a relatedExpenseId, it should NOT be visible
      if (t.type === 'settlement' && t.relatedExpenseId) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Settlement with relatedExpenseId found in transactions list (should be filtered):', {
            id: t.id,
            relatedExpenseId: t.relatedExpenseId,
          });
        }
        return false; // Hide it
      }
      return true; // Show everything else
    });
    
    if (filter === 'all') {
      return baseTransactions;
    }
    
    if (filter === 'my-spending') {
      // Show only expenses paid by current user
      return baseTransactions.filter(t => t.type === 'purchase' && t.paidById === user?.uid);
    }
    
    if (filter === 'involved') {
      // Show expenses where user is involved (in splitWith array)
      return baseTransactions.filter(t => {
        if (t.type === 'purchase') {
          return t.splitWith.includes(user?.uid || '');
        }
        // For settlements, show if user is either sender or receiver
        return t.fromId === user?.uid || t.toId === user?.uid;
      });
    }
    
    return baseTransactions;
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
