import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface NetBalanceCardProps {
  balance: number;
}

export function NetBalanceCard({ balance }: NetBalanceCardProps) {
  const isPositive = balance >= 0;
  const sign = isPositive ? "+" : "-";
  const absoluteBalance = Math.abs(balance);
  const formattedBalance = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(absoluteBalance);

  return (
    <Card className="card-hover gradient-overlay overflow-hidden relative" role="region" aria-label="Net Balance Summary">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-pulse-soft opacity-50" aria-hidden="true" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium">My Net Balance</CardTitle>
        {isPositive ? (
          <div className="rounded-full bg-gradient-to-br from-primary/20 to-accent/20 p-3 ring-1 ring-primary/20" aria-label="Positive balance indicator">
            <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
        ) : (
          <div className="rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 p-3 ring-1 ring-destructive/20" aria-label="Negative balance indicator">
            <TrendingDown className="h-5 w-5 text-destructive" aria-hidden="true" />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
            isPositive ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
          }`}
          role="status"
          aria-live="polite"
        >
          {sign}{formattedBalance}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {isPositive ? "You are owed money" : "You owe money"}
        </p>
      </CardContent>
    </Card>
  );
}
