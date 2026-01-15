"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { Transaction, User, Purchase, Settlement } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
<<<<<<< HEAD
import { ArrowUpDown, Pencil, Trash2 } from "lucide-react"
=======
import { ArrowUpDown, Pencil, Trash2, Eye } from "lucide-react"
>>>>>>> b1ced05eefb76d6263339274a19fa1e5f88b2ebd
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
import { SettlementForm } from "@/components/settlement-form"
import { deletePurchase } from "@/lib/db/purchases"
import { deleteSettlement } from "@/lib/db/settlements"
import { useFirestore, useUser } from "@/firebase"
import { toast } from "@/lib/toast"
<<<<<<< HEAD
import { useState } from "react"
=======
import { useState, useMemo } from "react"
>>>>>>> b1ced05eefb76d6263339274a19fa1e5f88b2ebd
import { getCategoryIcon } from "@/lib/category-icons"
import { formatName, formatCurrency } from "@/lib/format"

// Action cell component for edit and delete
function ActionCell({ transaction }: { transaction: Transaction }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();

  // Check if the current user owns this transaction
  const isOwner = user && (
    (transaction.type === 'purchase' && transaction.paidById === user.uid) ||
    (transaction.type === 'settlement' && transaction.fromId === user.uid)
  );

  // Don't show actions if user doesn't own the transaction
  if (!isOwner) {
    return null;
  }

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      if (transaction.type === 'purchase') {
        await deletePurchase(firestore, user.uid, transaction.id);
        toast.success("Expense Deleted", "The expense has been successfully deleted.");
      } else {
        await deleteSettlement(firestore, transaction.id);
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
    const message = transaction.type === 'purchase' ? "Expense Updated" : "Settlement Updated";
    const description = transaction.type === 'purchase' 
      ? "The expense has been successfully updated." 
      : "The settlement has been successfully updated.";
    toast.success(message, description);
  };

  return (
    <div className="flex items-center gap-2">
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
            <span className="sr-only">Edit {transaction.type === 'purchase' ? 'expense' : 'settlement'}</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">
              {transaction.type === 'purchase' ? 'Edit Expense' : 'Edit Settlement'}
            </DialogTitle>
          </DialogHeader>
          {transaction.type === 'purchase' ? (
            <ExpenseForm expense={transaction as Purchase} onSuccess={handleEditSuccess} />
          ) : (
            <SettlementForm settlement={transaction as Settlement} onSuccess={handleEditSuccess} />
          )}
        </DialogContent>
      </Dialog>

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

<<<<<<< HEAD
=======
// View expense details dialog component
function ViewExpenseDialog({ transaction, users }: { transaction: Transaction; users: User[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const getUser = (id: string): User | undefined => users.find(u => u.id === id);

  // Calculate per-head cost
  const splitWithLength = transaction.splitWith?.length || 0;
  const perHeadCost = useMemo(() => {
    return transaction.type === 'purchase' && splitWithLength > 0
      ? transaction.amount / splitWithLength
      : 0;
  }, [transaction.type, transaction.amount, splitWithLength]);

  if (transaction.type !== 'purchase') {
    // For settlements, show minimal details
    const fromUser = getUser(transaction.fromId);
    const toUser = getUser(transaction.toId);
    
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
            <span className="sr-only">View settlement details</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Settlement Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">From</p>
                <div className="flex items-center gap-2 mt-1">
                  {fromUser && (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={fromUser.avatar} />
                        <AvatarFallback>{fromUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{formatName(fromUser.name)}</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">To</p>
                <div className="flex items-center gap-2 mt-1">
                  {toUser && (
                    <>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={toUser.avatar} />
                        <AvatarFallback>{toUser.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{formatName(toUser.name)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Amount</p>
              <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(transaction.amount)}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date</p>
              <p className="font-medium mt-1">{new Date(transaction.date).toLocaleDateString('en-IN', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // For purchases, show full details
  const paidByUser = getUser(transaction.paidById);
  const CategoryIcon = getCategoryIcon(transaction.category);
  
  // Get payers information for multiple payment scenario
  const payers = useMemo(() => {
    if (transaction.paymentType === 'multiple' && transaction.paidByAmounts) {
      return Object.entries(transaction.paidByAmounts)
        .filter(([_, amount]) => amount > 0)
        .map(([userId, amount]) => {
          const user = getUser(userId);
          return user ? { user, amount } : null;
        })
        .filter((payer): payer is { user: User; amount: number } => payer !== null);
    }
    return [];
  }, [transaction.paymentType, transaction.paidByAmounts, users]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Eye className="h-4 w-4" />
          <span className="sr-only">View expense details</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[95vw] max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-headline text-xl">Expense Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Item Name and Category */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Item</p>
            <div className="flex items-center gap-2 mt-1">
              <div className="rounded-full p-1.5 bg-accent/10 flex-shrink-0">
                <CategoryIcon className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-semibold">{transaction.itemName}</p>
                <p className="text-sm text-muted-foreground">{transaction.category}</p>
              </div>
            </div>
          </div>

          {/* Total Amount */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Amount</p>
            <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(transaction.amount)}</p>
          </div>

          {/* Date */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Date</p>
            <p className="font-medium mt-1">{new Date(transaction.date).toLocaleDateString('en-IN', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>

          {/* Paid By */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Paid By</p>
            {transaction.paymentType === 'multiple' && payers.length > 0 ? (
              <div className="space-y-2 mt-1">
                {payers.map(({ user, amount }) => {
                  const { id, avatar, name } = user;
                  return (
                    <div key={id} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={avatar} />
                          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{formatName(name)}</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                {paidByUser && (
                  <>
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={paidByUser.avatar} />
                      <AvatarFallback>{paidByUser.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{formatName(paidByUser.name)}</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Split With */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Split With ({transaction.splitWith?.length || 0} members)</p>
            <div className="space-y-2 mt-1">
              {transaction.splitWith?.map(userId => {
                const user = getUser(userId);
                if (!user) return null;
                return (
                  <div key={userId} className="flex items-center justify-between p-2 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{formatName(user.name)}</span>
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">{formatCurrency(perHeadCost)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Per Head Cost Summary */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Cost Per Person</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(perHeadCost)}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

>>>>>>> b1ced05eefb76d6263339274a19fa1e5f88b2ebd

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
      const formatted = formatCurrency(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    header: "Paid By / From",
    cell: ({ row }) => {
      const transaction = row.original;
      
      // Handle multiple payers for purchases
      if (transaction.type === 'purchase' && transaction.paymentType === 'multiple' && transaction.paidByAmounts) {
        const payers = Object.keys(transaction.paidByAmounts)
          .filter(userId => (transaction.paidByAmounts?.[userId] || 0) > 0)
          .map(userId => getUser(userId))
          .filter((user): user is User => user !== null && user !== undefined);
        
        if (payers.length === 0) {
          const fallbackUser = getUser(transaction.paidById);
          return fallbackUser ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={fallbackUser.avatar} />
                <AvatarFallback>{fallbackUser.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <span>{formatName(fallbackUser.name)}</span>
            </div>
          ) : null;
        }
        
        return (
          <div className="flex items-center gap-1">
            <div className="flex -space-x-2">
              {payers.slice(0, 3).map((payer) => (
                <Avatar key={payer.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={payer.avatar} />
                  <AvatarFallback>{payer.name.charAt(0)}</AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-sm ml-2">
              {payers.length === 1 
                ? formatName(payers[0].name)
                : payers.length === 2
                ? `${formatName(payers[0].name)} & ${formatName(payers[1].name)}`
                : `${payers.length} people`
              }
            </span>
          </div>
        );
      }
      
      // Handle single payer or settlements
      const user = getUser(transaction.type === 'purchase' ? transaction.paidById : transaction.fromId);
      if (!user) return null;
      return (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{formatName(user.name)}</span>
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
            <span>{formatName(user.name)}</span>
        </div>
        )
    }
  },
  {
<<<<<<< HEAD
=======
    id: "view",
    header: "View",
    cell: ({ row }) => {
      const transaction = row.original;
      return <ViewExpenseDialog transaction={transaction} users={users} />;
    },
  },
  {
>>>>>>> b1ced05eefb76d6263339274a19fa1e5f88b2ebd
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const transaction = row.original;
      return <ActionCell transaction={transaction} />;
    },
  },
  ];
};
