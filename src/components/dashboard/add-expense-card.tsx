"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpenseForm } from "@/components/expense-form";
import { toast } from "@/lib/toast";

export function AddExpenseCard() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleExpenseSuccess = () => {
    setIsFormOpen(false);
    toast.success("Expense Added", "Successfully added the expense.");
  };

  return (
    <>
      <Card 
        className="border-dashed border-2 border-slate-600 cursor-pointer transition-all hover:brightness-110 bg-transparent h-full" 
        role="button" 
        aria-label="Add New Expense"
        onClick={() => setIsFormOpen(true)}
      >
        <CardContent className="flex flex-col items-center justify-center h-full p-8">
          <div className="w-16 h-16 rounded-full bg-slate-700/50 flex items-center justify-center mb-4 hover:bg-slate-700 transition-colors">
            <Plus className="h-8 w-8 text-slate-300" aria-hidden="true" />
          </div>
          <p className="text-sm text-slate-400 font-medium">
            Add Expense
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
