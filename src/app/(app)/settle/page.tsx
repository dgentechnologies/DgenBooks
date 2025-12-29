"use client";

import { useState, useMemo } from "react";
import { initialTransactions } from "@/lib/data";
import type { Debt, Settlement, Transaction } from "@/lib/types";
import { calculateBalances } from "@/lib/logic";
import { DebtCard } from "@/components/settle/debt-card";
import { useToast } from "@/hooks/use-toast";

export default function SettleUpPage() {
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const { toast } = useToast();

  const { debts } = useMemo(() => calculateBalances(transactions), [transactions]);

  const handleSettle = (debt: Debt) => {
    const newSettlement: Settlement = {
      id: `settle_${Date.now()}`,
      type: "settlement",
      fromId: debt.from.id,
      toId: debt.to.id,
      amount: debt.amount,
      date: new Date().toISOString(),
    };
    setTransactions(prev => [...prev, newSettlement]);
    toast({
      title: "Debt Settled!",
      description: `${debt.from.name} paid ${debt.to.name} ₹${debt.amount.toFixed(2)}.`,
    });
  };

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
