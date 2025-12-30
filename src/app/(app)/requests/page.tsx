"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, ShoppingBag, AlertCircle } from "lucide-react";
import { usePurchaseRequests } from "@/hooks/use-purchase-requests";
import { useUsers } from "@/hooks/use-users";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RequestItemForm } from "@/components/request-item-form";
import { PurchaseRequestCard } from "@/components/purchase-request-card";
import { toast } from "@/lib/toast";

export default function PurchaseRequestsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { data: requests, isLoading } = usePurchaseRequests();
  const { users, isLoading: usersLoading } = useUsers();

  const handleRequestSuccess = () => {
    setIsAddDialogOpen(false);
    toast.success("Request Added", "Purchase request has been added successfully.");
  };

  if (isLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-3xl md:text-4xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
            Purchase Requests
          </h2>
          <p className="text-muted-foreground/80 text-base">
            Manage items that need to be purchased by the team.
          </p>
        </div>
        <Button
          onClick={() => setIsAddDialogOpen(true)}
          size="lg"
          className="transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          <Plus className="mr-2 h-5 w-5" />
          Request Item
        </Button>
      </div>

      {/* Purchase Requests List */}
      {requests && requests.length > 0 ? (
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <PurchaseRequestCard
              key={request.id}
              request={request}
              users={users}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-4 mb-4">
              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
            <p className="text-muted-foreground text-center mb-4 max-w-md">
              Get started by requesting items that need to be purchased for the team.
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Request First Item
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add Request Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="w-[95vw] max-w-[425px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-headline text-xl">Request New Item</DialogTitle>
          </DialogHeader>
          <RequestItemForm onSuccess={handleRequestSuccess} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
