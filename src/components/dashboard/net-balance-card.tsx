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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">My Net Balance</CardTitle>
        {isPositive ? (
          <TrendingUp className="h-5 w-5 text-primary" />
        ) : (
          <TrendingDown className="h-5 w-5 text-red-500" />
        )}
      </CardHeader>
      <CardContent>
        <div
          className={`text-3xl font-bold ${
            isPositive ? "text-primary" : "text-red-500"
          }`}
        >
          {formattedBalance}
        </div>
        <p className="text-xs text-muted-foreground">
          {isPositive ? "You are owed money" : "You owe money"}
        </p>
      </CardContent>
    </Card>
  );
}
