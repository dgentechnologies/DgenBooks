import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Transaction } from "@/lib/types";
import { users } from "@/lib/data";
import { ShoppingCart, ArrowRightLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface RecentActivityProps {
  transactions: Transaction[];
}

const getUser = (id: string) => users.find(u => u.id === id);

export function RecentActivity({ transactions }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[120px]">
          <div className="space-y-4">
            {transactions.map((transaction) => {
              const date = new Date(transaction.date);
              return (
                <div key={transaction.id} className="flex items-center gap-4">
                  <div className="rounded-full bg-muted p-2">
                    {transaction.type === 'purchase' ? 
                      <ShoppingCart className="h-5 w-5 text-accent" /> : 
                      <ArrowRightLeft className="h-5 w-5 text-primary" />}
                  </div>
                  <div className="flex-grow">
                    {transaction.type === 'purchase' ? (
                      <>
                        <p className="text-sm font-medium leading-none">
                          {transaction.itemName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Paid by {getUser(transaction.paidById)?.name}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-none">
                          Settlement
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {getUser(transaction.fromId)?.name} paid {getUser(transaction.toId)?.name}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right">
                     <div className="font-medium">
                      ₹{transaction.amount.toLocaleString("en-IN")}
                    </div>
                     <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })}
             {transactions.length === 0 && <p className="text-sm text-muted-foreground text-center">No recent activity.</p>}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
