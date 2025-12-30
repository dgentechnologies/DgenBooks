"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertCircle, Clock, DollarSign, User, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { ExpenseForm } from "@/components/expense-form";
import { toast } from "@/lib/toast";
import { useFirestore } from "@/firebase";
import { updatePurchaseRequest } from "@/lib/db";
import type { PurchaseRequest, User as UserType } from "@/lib/types";

interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  users: UserType[];
}

export function PurchaseRequestCard({ request, users }: PurchaseRequestCardProps) {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const firestore = useFirestore();
  const requestedUser = users.find(u => u.id === request.requestedBy);

  const handleMarkAsPurchased = () => {
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseSuccess = async () => {
    // Update the purchase request status to 'Purchased'
    try {
      // Note: Any authenticated user can mark as purchased per Firestore rules
      await updatePurchaseRequest(firestore, '', request.id, {
        status: 'Purchased',
      });
      
      setIsExpenseDialogOpen(false);
      toast.success("Item Purchased", `${request.itemName} has been marked as purchased and added to expenses.`);
    } catch (error) {
      console.error('Error updating purchase request:', error);
      toast.error("Error", "Failed to update purchase request status.");
    }
  };

  return (
    <>
      <Card 
        className={`transition-all hover:shadow-lg ${
          request.priority === 'Urgent' 
            ? 'border-red-500 border-2 bg-red-500/5' 
            : 'border-border'
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-lg leading-tight">{request.itemName}</h3>
            <Badge 
              variant={request.priority === 'Urgent' ? 'destructive' : 'secondary'}
              className="shrink-0"
            >
              {request.priority === 'Urgent' && <AlertCircle className="h-3 w-3 mr-1" />}
              {request.priority}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <User className="h-4 w-4 mr-2" />
            <span>Requested by {requestedUser?.name || 'Unknown'}</span>
          </div>
          
          {request.estimatedCost && (
            <div className="flex items-center text-muted-foreground">
              <DollarSign className="h-4 w-4 mr-2" />
              <span>Est. Cost: ${request.estimatedCost.toFixed(2)}</span>
            </div>
          )}
          
          <div className="flex items-center text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            <span>
              {request.createdAt 
                ? format(
                    typeof request.createdAt === 'string' 
                      ? new Date(request.createdAt) 
                      : (request.createdAt as any).toDate?.() || new Date(),
                    'MMM d, yyyy'
                  )
                : 'Recently'
              }
            </span>
          </div>
        </CardContent>
        
        <CardFooter>
          <Button 
            onClick={handleMarkAsPurchased}
            className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            variant={request.priority === 'Urgent' ? 'default' : 'outline'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Purchased
          </Button>
        </CardFooter>
      </Card>

      {/* Expense Dialog - Pre-filled with item name */}
      <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-md lg:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Add Expense for "{request.itemName}"</DialogTitle>
          </DialogHeader>
          <ExpenseForm 
            onSuccess={handleExpenseSuccess}
            prefillData={{
              itemName: request.itemName,
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
