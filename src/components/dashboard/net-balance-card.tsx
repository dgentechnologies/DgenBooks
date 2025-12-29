import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";

interface NetBalanceCardProps {
  balance: number;
}

export function NetBalanceCard({ balance }: NetBalanceCardProps) {
  const isPositive = balance >= 0;
  const formattedBalance = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(balance);

  return (
    <Card className="card-hover gradient-overlay overflow-hidden relative">
      {/* Subtle animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 animate-pulse-soft opacity-50" />
      
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
        <CardTitle className="text-sm font-medium">My Net Balance</CardTitle>
        {isPositive ? (
          <div className="rounded-full bg-primary/10 p-2">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <div className="rounded-full bg-destructive/10 p-2">
            <TrendingDown className="h-5 w-5 text-destructive" />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative z-10">
        <div
          className={`text-2xl sm:text-3xl font-bold transition-colors duration-300 ${
            isPositive ? "text-primary" : "text-destructive"
          }`}
        >
          {formattedBalance}
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          {isPositive ? "You are owed money" : "You owe money"}
        </p>
      </CardContent>
    </Card>
  );
}
