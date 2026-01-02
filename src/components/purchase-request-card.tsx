"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Clock, IndianRupee, User, CheckCircle2, Edit, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ExpenseForm } from "@/components/expense-form";
import { RequestItemForm } from "@/components/request-item-form";
import { toast } from "@/lib/toast";
import { useFirestore, useUser } from "@/firebase";
import { deletePurchaseRequest } from "@/lib/db";
import type { PurchaseRequest, User as UserType } from "@/lib/types";

interface PurchaseRequestCardProps {
  request: PurchaseRequest;
  users: UserType[];
}

export function PurchaseRequestCard({ request, users }: PurchaseRequestCardProps) {
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const firestore = useFirestore();
  const { user } = useUser();
  const requestedUser = users.find(u => u.id === request.requestedBy);
  
  // Check if current user is the creator
  const isCreator = user?.uid === request.requestedBy;

  const handleMarkAsPurchased = () => {
    setIsExpenseDialogOpen(true);
  };

  const handleExpenseSuccess = async () => {
    // Delete the purchase request after it has been purchased and added to expenses
    try {
      // Note: Any authenticated user can delete a purchase request per Firestore rules
      await deletePurchaseRequest(firestore, '', request.id);
      
      setIsExpenseDialogOpen(false);
      toast.success("Item Purchased", `${request.itemName} has been marked as purchased and added to expenses.`);
    } catch (error) {
      console.error('Error deleting purchase request:', error);
      toast.error("Error", "Failed to remove purchase request.");
    }
  };
  
  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    toast.success("Request Updated", "Purchase request has been updated successfully.");
  };
  
  const handleDelete = async () => {
    try {
      await deletePurchaseRequest(firestore, user?.uid || '', request.id);
      setIsDeleteDialogOpen(false);
      toast.success("Request Deleted", "Purchase request has been deleted successfully.");
    } catch (error) {
      console.error('Error deleting purchase request:', error);
      toast.error("Error", "Failed to delete purchase request.");
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
            <h3 className="font-semibold text-lg leading-tight">
              {request.itemName}
              {request.quantity && request.quantity > 1 && (
                <span className="text-sm text-muted-foreground ml-2">(x{request.quantity})</span>
              )}
            </h3>
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
              <IndianRupee className="h-4 w-4 mr-2" />
              <span>Est. Cost: ₹{request.estimatedCost.toFixed(2)}</span>
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
        
        <CardFooter className="flex flex-col gap-2">
          <Button 
            onClick={handleMarkAsPurchased}
            className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            variant={request.priority === 'Urgent' ? 'default' : 'outline'}
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Mark as Purchased
          </Button>
          
          {isCreator && (
            <div className="flex gap-2 w-full">
              <Button
                onClick={() => setIsEditDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button
                onClick={() => setIsDeleteDialogOpen(true)}
                variant="outline"
                size="sm"
                className="flex-1 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          )}
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
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Edit Request</DialogTitle>
          </DialogHeader>
          <RequestItemForm 
            onSuccess={handleEditSuccess}
            request={request}
          />
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the purchase request for "{request.itemName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
