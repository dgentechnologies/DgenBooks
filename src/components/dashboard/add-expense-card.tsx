"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expense-form";
import { useToast } from "@/hooks/use-toast";

export function AddExpenseCard() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { toast } = useToast();

  const handleExpenseSuccess = () => {
    setIsFormOpen(false);
    toast({
      title: "Expense Added",
      description: `Successfully added the expense.`,
    });
  };

  return (
    <>
      <Card 
        className="card-hover gradient-overlay overflow-hidden relative cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]" 
        role="button" 
        aria-label="Add New Expense"
        onClick={() => setIsFormOpen(true)}
      >
        {/* Subtle animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-pulse-soft opacity-50" aria-hidden="true" />
        
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-medium">Add Expense</CardTitle>
          <div className="rounded-full bg-primary/10 p-2">
            <Plus className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-2xl sm:text-3xl font-bold text-primary">
            New
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Click to add a new expense
          </p>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Add New Expense</DialogTitle>
          </DialogHeader>
          <ExpenseForm onSuccess={handleExpenseSuccess} />
        </DialogContent>
      </Dialog>
    </>
  );
}
