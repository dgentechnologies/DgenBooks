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
    <div className="space-y-6">
       <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight font-headline">Who Owes Who</h2>
        <p className="text-muted-foreground">
          A summary of all outstanding debts. Click settle to record a payment.
        </p>
      </div>
      {debts.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {debts.map((debt, index) => (
            <DebtCard key={`${debt.from.id}-${debt.to.id}-${index}`} debt={debt} onSettle={handleSettle} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted h-64">
            <h3 className="text-xl font-semibold font-headline">All Settled Up!</h3>
            <p className="text-muted-foreground">There are no outstanding debts.</p>
        </div>
      )}
    </div>
  );
}
