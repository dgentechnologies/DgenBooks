"use client";

import React, { useState, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NetBalanceCard } from "@/components/dashboard/net-balance-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SpendingByCategoryChart } from "@/components/dashboard/spending-by-category-chart";
import { TotalSpendingChart } from "@/components/dashboard/total-spending-chart";
import { ExpenseForm } from "@/components/expense-form";
import type { Transaction } from "@/lib/types";
import { initialTransactions, currentUser } from "@/lib/data";
import { calculateBalances } from "@/lib/logic";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const { netBalances } = useMemo(() => calculateBalances(transactions), [transactions]);
  const myNetBalance = netBalances.get(currentUser.id) || 0;

  const handleAddTransaction = (newTransaction: Transaction) => {
    setTransactions(prev => [newTransaction, ...prev]);
    setIsFormOpen(false);
    toast({
      title: "Expense Added",
      description: `Successfully added the expense.`,
    });
  };
  
  const purchases = useMemo(() => transactions.filter(t => t.type === 'purchase'), [transactions]);

  return (
    <div className="relative space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <NetBalanceCard balance={myNetBalance} />
        </div>
        <div className="lg:col-span-2">
          <RecentActivity transactions={transactions.slice(0, 5)} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <TotalSpendingChart purchases={purchases} />
        </div>
        <div className="lg:col-span-2">
          <SpendingByCategoryChart purchases={purchases} />
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
           <Button className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-lg md:hidden" variant="default" size="icon">
            <Plus className="h-8 w-8" />
            <span className="sr-only">Add Expense</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Add New Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSave={handleAddTransaction} />
        </DialogContent>
      </Dialog>
       <div className="hidden md:block">
         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button className="fixed bottom-8 right-8 h-14" variant="default">
              <Plus className="mr-2 h-5 w-5" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md lg:max-w-lg">
            <DialogHeader>
              <DialogTitle className="font-headline">Add New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm onSave={handleAddTransaction} />
          </DialogContent>
         </Dialog>
      </div>
    </div>
  );
}
