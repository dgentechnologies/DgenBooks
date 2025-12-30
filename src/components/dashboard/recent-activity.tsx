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
    <Card className="card-hover h-full" role="region" aria-label="Recent Activity">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Recent Activity</span>
          {transactions.length > 0 && (
            <span className="ml-auto text-xs font-normal text-muted-foreground" aria-label={`Showing ${transactions.length} transactions`}>
              Last {transactions.length} transactions
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[140px] pr-4">
          <div className="space-y-3" role="list">
            {transactions.map((transaction, index) => {
              const date = new Date(transaction.date);
              return (
                <div 
                  key={transaction.id} 
                  className="flex items-center gap-3 sm:gap-4 p-2 rounded-lg hover:bg-accent/5 transition-colors animate-fade-in"
                  style={{animationDelay: `${index * 0.05}s`}}
                  role="listitem"
                >
                  <div className={`rounded-full p-2 flex-shrink-0 ${
                    transaction.type === 'purchase' 
                      ? 'bg-gradient-to-br from-accent/20 to-accent/10 ring-1 ring-accent/20' 
                      : 'bg-gradient-to-br from-primary/20 to-primary/10 ring-1 ring-primary/20'
                  }`} aria-hidden="true">
                    {transaction.type === 'purchase' ? 
                      <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 text-accent" /> : 
                      <ArrowRightLeft className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />}
                  </div>
                  <div className="flex-grow min-w-0">
                    {transaction.type === 'purchase' ? (
                      <>
                        <p className="text-sm font-medium leading-none truncate">
                          {transaction.itemName}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                          Paid by {getUser(transaction.paidById)?.name}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-none">
                          Settlement
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                          {getUser(transaction.fromId)?.name} → {getUser(transaction.toId)?.name}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                     <div className="font-medium text-sm sm:text-base">
                      ₹{transaction.amount.toLocaleString("en-IN")}
                    </div>
                     <div className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(date, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
            })}
             {transactions.length === 0 && (
               <div className="flex flex-col items-center justify-center py-8 text-center" role="status">
                 <p className="text-sm text-muted-foreground">No recent activity.</p>
                 <p className="text-xs text-muted-foreground mt-1">Add your first expense to get started</p>
               </div>
             )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
