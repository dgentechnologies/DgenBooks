import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Transaction, User } from "@/lib/types";
import { ArrowRightLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatName, formatCurrency } from "@/lib/format";

interface RecentActivityProps {
  transactions: Transaction[];
  users: User[];
}

const getUser = (users: User[], id: string) => users.find(u => u.id === id);

export function RecentActivity({ transactions, users }: RecentActivityProps) {
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
              const CategoryIcon = transaction.type === 'purchase' ? getCategoryIcon(transaction.category) : ArrowRightLeft;
              const iconColor = transaction.type === 'purchase' ? 'text-accent' : 'text-primary';
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
                    <CategoryIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-grow min-w-0">
                    {transaction.type === 'purchase' ? (
                      <>
                        <p className="text-sm font-medium leading-none truncate">
                          {transaction.itemName}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                          {transaction.paymentType === 'multiple' && transaction.paidByAmounts ? (
                            (() => {
                              const payers = Object.keys(transaction.paidByAmounts)
                                .filter(userId => (transaction.paidByAmounts?.[userId] || 0) > 0)
                                .map(userId => getUser(users, userId))
                                .filter(user => user !== null && user !== undefined);
                              
                              if (payers.length === 0) {
                                return `Paid by ${formatName(getUser(users, transaction.paidById)?.name || '')}`;
                              }
                              
                              return payers.length === 1
                                ? `Paid by ${formatName(payers[0]!.name)}`
                                : payers.length === 2
                                ? `Paid by ${formatName(payers[0]!.name)} & ${formatName(payers[1]!.name)}`
                                : `Paid by ${payers.length} people`;
                            })()
                          ) : (
                            `Paid by ${formatName(getUser(users, transaction.paidById)?.name || '')}`
                          )}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm font-medium leading-none">
                          Settlement
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate mt-1">
                          {formatName(getUser(users, transaction.fromId)?.name || '')} → {formatName(getUser(users, transaction.toId)?.name || '')}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                     <div className="font-medium text-sm sm:text-base">
                      {formatCurrency(transaction.amount)}
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
