"use client";

import React, { useMemo, useEffect } from "react";
import { NetBalanceCard } from "@/components/dashboard/net-balance-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SpendingByCategoryChart } from "@/components/dashboard/spending-by-category-chart";
import { TotalSpendingChart } from "@/components/dashboard/total-spending-chart";
import { AddExpenseCard } from "@/components/dashboard/add-expense-card";
import type { Transaction } from "@/lib/types";
import { calculateBalances } from "@/lib/logic";
import { useRouter } from "next/navigation";
import { useAllExpenses } from "@/hooks/use-all-expenses";
import { useUsers } from "@/hooks/use-users";
import { useUser } from "@/firebase";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useUser();
  
  // Fetch ALL purchases and settlements from all users
  const { purchases, settlements, isLoading: expensesLoading } = useAllExpenses();
  
  // Combine purchases and settlements into transactions
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];
    allTransactions.push(...purchases);
    allTransactions.push(...settlements);
    // Sort by date, most recent first
    return allTransactions.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [purchases, settlements]);

  // Fetch user profiles for all participants referenced in the transactions.
  // transactionsReady is true only once both data sources have finished loading,
  // so useUsers knows when it is safe to derive the UID list.
  const transactionsReady = !expensesLoading;
  const { users, isLoading: usersLoading, uidMapping } = useUsers(transactions, transactionsReady);

  const { netBalances } = useMemo(() => calculateBalances(transactions, users, uidMapping), [transactions, users, uidMapping]);
  const myNetBalance = netBalances?.get(user?.uid || '') || 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + L: Go to log
      if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
        event.preventDefault();
        router.push('/log');
      }
      // Ctrl/Cmd + S: Go to settle
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        router.push('/settle');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router]);
  
  const purchasesList = useMemo(() => transactions.filter(t => t.type === 'purchase'), [transactions]);

  if (expensesLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative space-y-4 sm:space-y-6 animate-fade-in">
      {/* Welcome Section - Premium touch */}
      <div className="hidden sm:block mb-6">
        <h2 className="text-3xl md:text-4xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
          Welcome back!
        </h2>
        <p className="text-muted-foreground/80 text-base">
          Here is your financial overview for today.
        </p>
      </div>

      {/* Top Stats Grid - Fully Responsive */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
        <div className="md:col-span-2 animate-slide-in-right" style={{animationDelay: '0.1s'}}>
          <NetBalanceCard balance={myNetBalance} />
        </div>
        <div className="animate-slide-in-right" style={{animationDelay: '0.2s'}}>
          <AddExpenseCard />
        </div>
        <div className="md:col-span-3 animate-slide-in-right" style={{animationDelay: '0.3s'}}>
          <RecentActivity transactions={transactions.slice(0, 5)} users={users} />
        </div>
      </div>

      {/* Charts Grid - Enhanced Responsiveness */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 animate-slide-in-right" style={{animationDelay: '0.4s'}}>
          <TotalSpendingChart purchases={purchasesList} users={users} />
        </div>
        <div className="lg:col-span-2 animate-slide-in-right" style={{animationDelay: '0.5s'}}>
          <SpendingByCategoryChart purchases={purchasesList} />
        </div>
      </div>
    </div>
  );
}
