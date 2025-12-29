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
    <div className="space-y-4">
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All Expenses</TabsTrigger>
          <TabsTrigger value="my">My Expenses</TabsTrigger>
        </TabsList>
      </Tabs>
      <DataTable columns={columns} data={filteredTransactions} />
    </div>
  );
}
