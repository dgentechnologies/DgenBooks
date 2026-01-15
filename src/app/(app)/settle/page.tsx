"use client";

import { useState, useMemo } from "react";
import type { Debt, Settlement, Transaction } from "@/lib/types";
import { calculateBalances } from "@/lib/logic";
import { DebtCard } from "@/components/settle/debt-card";
import { toast } from "@/lib/toast";
import { useUserPurchases } from "@/hooks/use-purchases";
import { useUserSettlements } from "@/hooks/use-settlements";
import { useUsers } from "@/hooks/use-users";
import { useUser, useFirestore } from "@/firebase";
import { createSettlement } from "@/lib/db";
import { Loader2 } from "lucide-react";

export default function SettleUpPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  // Fetch purchases and settlements from Firebase
  const { data: purchases, isLoading: purchasesLoading } = useUserPurchases();
  const { data: settlements, isLoading: settlementsLoading } = useUserSettlements();
  const { users, isLoading: usersLoading } = useUsers();
  
  // Combine purchases and settlements into transactions
  const transactions = useMemo(() => {
    const allTransactions: Transaction[] = [];
    if (purchases) {
      allTransactions.push(...purchases);
    }
    if (settlements) {
      allTransactions.push(...settlements);
    }
    return allTransactions;
  }, [purchases, settlements]);

  const { debts } = useMemo(() => calculateBalances(transactions, users), [transactions, users]);

  const handleSettle = async (debt: Debt, customAmount?: number) => {
    if (!user) return;
    
    try {
      const settlementAmount = customAmount || debt.amount;
      const settlementData: Omit<Settlement, 'id'> = {
        type: "settlement",
        fromId: debt.from.id,
        toId: debt.to.id,
        amount: settlementAmount,
        date: new Date().toISOString(),
      };
      
      await createSettlement(firestore, user.uid, settlementData);
      
      toast.success("Debt Settled!", `${debt.from.name} paid ${debt.to.name} ₹${settlementAmount.toFixed(2)}.`);
    } catch (error) {
      console.error('Error settling debt:', error);
      toast.error("Error", "Failed to settle debt. Please try again.");
    }
  };

  if (purchasesLoading || settlementsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
       <div className="space-y-2">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-headline">Who Owes Who</h2>
        <p className="text-sm sm:text-base text-muted-foreground">
          A summary of all outstanding debts. Click settle to record a payment.
        </p>
      </div>
      {debts.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {debts.map((debt, index) => (
            <div 
              key={`${debt.from.id}-${debt.to.id}-${index}`}
              className="animate-slide-in-right"
              style={{animationDelay: `${index * 0.1}s`}}
            >
              <DebtCard debt={debt} onSettle={handleSettle} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted h-64 sm:h-80 bg-accent/5 animate-fade-in">
            <div className="text-primary/20 mb-4">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-16 w-16 sm:h-20 sm:w-20" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg sm:text-xl font-semibold font-headline">All Settled Up!</h3>
            <p className="text-sm sm:text-base text-muted-foreground mt-2">There are no outstanding debts.</p>
        </div>
      )}
    </div>
  );
}
