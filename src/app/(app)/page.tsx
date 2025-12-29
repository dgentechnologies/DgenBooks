"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NetBalanceCard } from "@/components/dashboard/net-balance-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { SpendingByCategoryChart } from "@/components/dashboard/spending-by-category-chart";
import { TotalSpendingChart } from "@/components/dashboard/total-spending-chart";
import { ExpenseForm } from "@/components/expense-form";
import type { Transaction } from "@/lib/types";
import { calculateBalances } from "@/lib/logic";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useUserPurchases } from "@/hooks/use-purchases";
import { useUserSettlements } from "@/hooks/use-settlements";
import { useUser } from "@/firebase";

export default function DashboardPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
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

  const { netBalances } = useMemo(() => calculateBalances(transactions), [transactions]);
  const myNetBalance = netBalances.get(user?.uid || '') || 0;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl/Cmd + N: New expense
      if ((event.ctrlKey || event.metaKey) && event.key === 'n') {
        event.preventDefault();
        setIsFormOpen(true);
      }
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

  const handleExpenseSuccess = () => {
    setIsFormOpen(false);
    toast({
      title: "Expense Added",
      description: `Successfully added the expense.`,
    });
  };
  
  const purchasesList = useMemo(() => transactions.filter(t => t.type === 'purchase'), [transactions]);

  if (purchasesLoading || settlementsLoading) {
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
        <h2 className="text-2xl font-bold font-headline text-foreground/90">Welcome back!</h2>
        <p className="text-muted-foreground">
          Here's an overview of your expenses and balances.
          <span className="ml-2 text-xs">
            (Tip: Press <kbd className="px-1 py-0.5 text-xs font-semibold bg-muted border rounded">Ctrl+N</kbd> to add expense)
          </span>
        </p>
      </div>

      {/* Top Stats Grid - Fully Responsive */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div className="lg:col-span-1 animate-slide-in-right" style={{animationDelay: '0.1s'}}>
          <NetBalanceCard balance={myNetBalance} />
        </div>
        <div className="lg:col-span-2 animate-slide-in-right" style={{animationDelay: '0.2s'}}>
          <RecentActivity transactions={transactions.slice(0, 5)} />
        </div>
      </div>

      {/* Charts Grid - Enhanced Responsiveness */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 animate-slide-in-right" style={{animationDelay: '0.3s'}}>
          <TotalSpendingChart purchases={purchasesList} />
        </div>
        <div className="lg:col-span-2 animate-slide-in-right" style={{animationDelay: '0.4s'}}>
          <SpendingByCategoryChart purchases={purchasesList} />
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogTrigger asChild>
           <Button 
             className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-14 w-14 sm:h-16 sm:w-16 rounded-full shadow-2xl hover:shadow-primary/20 md:hidden z-50 transition-all hover:scale-110" 
             variant="default" 
             size="icon"
           >
            <Plus className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="sr-only">Add Expense</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-[425px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Add New Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSuccess={handleExpenseSuccess} />
        </DialogContent>
      </Dialog>
       <div className="hidden md:block">
         <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 h-12 lg:h-14 shadow-2xl hover:shadow-primary/20 transition-all hover:scale-105 z-50" 
              variant="default"
            >
              <Plus className="mr-2 h-5 w-5" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Add New Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm onSuccess={handleExpenseSuccess} />
          </DialogContent>
         </Dialog>
      </div>
    </div>
  );
}
