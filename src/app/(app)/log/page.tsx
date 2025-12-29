'use client'

import React, { useState, useMemo } from 'react';
import { initialTransactions } from '@/lib/data';
import type { Transaction } from '@/lib/types';
import { DataTable } from './data-table';
import { columns } from './columns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ExpenseLogPage() {
  const [transactions] = useState<Transaction[]>(initialTransactions);
  const [filter, setFilter] = useState('all');

  const filteredTransactions = useMemo(() => {
    if (filter === 'all') {
      return transactions;
    }
    // This is a simplified filter. A real implementation would check involvement.
    return transactions.filter(t => t.type === 'purchase' && t.paidById === 'user1');
  }, [transactions, filter]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Expense Log</h2>
          <p className="text-sm text-muted-foreground">View and manage all expenses</p>
        </div>
        <Tabs value={filter} onValueChange={setFilter} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="all" className="text-sm">All Expenses</TabsTrigger>
            <TabsTrigger value="my" className="text-sm">My Expenses</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="rounded-lg border bg-card card-hover">
        <DataTable columns={columns} data={filteredTransactions} />
      </div>
    </div>
  );
}
