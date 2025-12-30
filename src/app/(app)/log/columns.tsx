"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { Transaction, User, Purchase } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ExpenseForm } from "@/components/expense-form"
import { deletePurchase } from "@/lib/db/purchases"
import { deleteSettlement } from "@/lib/db/settlements"
import { useFirestore, useUser } from "@/firebase"
import { toast } from "@/lib/toast"
import { useState } from "react"
import { getCategoryIcon } from "@/lib/category-icons"

// Action cell component for edit and delete
function ActionCell({ transaction }: { transaction: Transaction }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      if (transaction.type === 'purchase') {
        await deletePurchase(firestore, user.uid, transaction.id);
        toast.success("Expense Deleted", "The expense has been successfully deleted.");
      } else {
        await deleteSettlement(firestore, user.uid, transaction.id);
        toast.success("Settlement Deleted", "The settlement has been successfully deleted.");
      }
    } catch (error: any) {
      console.error('Error deleting transaction:', error);
      
      // Check for permission denied error
      if (error?.message?.includes('PERMISSION_DENIED')) {
        toast.error("Action Denied", "You can only modify your own expenses.");
      } else {
        toast.error("Error", `Failed to delete the ${transaction.type === 'purchase' ? 'expense' : 'settlement'}. Please try again.`);
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditSuccess = () => {
    setIsEditOpen(false);
    toast.success("Expense Updated", "The expense has been successfully updated.");
  };

  return (
    <div className="flex items-center gap-2">
      {transaction.type === 'purchase' && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit expense</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-headline text-xl">Edit Expense</DialogTitle>
            </DialogHeader>
            <ExpenseForm expense={transaction as Purchase} onSuccess={handleEditSuccess} />
          </DialogContent>
        </Dialog>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
            <span className="sr-only">Delete {transaction.type === 'purchase' ? 'expense' : 'settlement'}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {transaction.type === 'purchase' ? 'Expense' : 'Settlement'}</AlertDialogTitle>
            <AlertDialogDescription>
              {transaction.type === 'purchase' 
                ? `Are you sure you want to delete "${transaction.itemName}"? This action cannot be undone.`
                : `Are you sure you want to delete this settlement? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}


export const createColumns = (users: User[]): ColumnDef<Transaction>[] => {
  const getUser = (id: string): User | undefined => users.find(u => u.id === id);
  
  return [
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return <div className="font-medium">{date.toLocaleDateString()}</div>
    },
  },
  {
    header: "Item",
    cell: ({ row }) => {
      const transaction = row.original;
      if (transaction.type === 'purchase') {
        const CategoryIcon = getCategoryIcon(transaction.category);
        return (
            <div className="flex items-center gap-2">
                <div className="rounded-full p-1.5 bg-accent/10 flex-shrink-0">
                  <CategoryIcon className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <div className="font-medium">{transaction.itemName}</div>
                  <div className="text-sm text-muted-foreground">{transaction.category}</div>
                </div>
            </div>
        )
      }
      return <div className="font-medium text-primary">Settlement</div>;
    },
  },
   {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    header: "Paid By / From",
    cell: ({ row }) => {
      const transaction = row.original;
      const user = getUser(transaction.type === 'purchase' ? transaction.paidById : transaction.fromId);
      if (!user) return null;
      return (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
        </div>
      )
    }
  },
  {
    header: "Split / To",
    cell: ({ row }) => {
        const transaction = row.original;
        if (transaction.type === 'purchase') {
            // Check if all current Firebase users are included in splitWith
            const allUsersIncluded = users.length > 0 && users.every(u => transaction.splitWith.includes(u.id));
            if (allUsersIncluded && transaction.splitWith.length === users.length) {
                return <Badge variant="secondary">All Members</Badge>
            }
            return <Badge variant="outline">{transaction.splitWith.length} Members</Badge>
        }

        const user = getUser(transaction.toId);
        if (!user) return null;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
        </div>
        )
    }
  },
  {
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const transaction = row.original;
      return <ActionCell transaction={transaction} />;
    },
  },
  ];
};
