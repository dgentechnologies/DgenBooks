import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface NetBalanceCardProps {
  balance: number;
}

export function NetBalanceCard({ balance }: NetBalanceCardProps) {
  const isPositive = balance >= 0;
  const sign = isPositive ? "+" : "";
  const formattedBalance = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(balance);

  return (
    <Card className="relative overflow-hidden" role="region" aria-label="Net Balance Summary">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>My Net Balance</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          className={`text-4xl font-bold ${
            isPositive ? "text-emerald-400" : "text-red-500"
          }`}
          role="status"
          aria-live="polite"
        >
          {sign}{formattedBalance}
        </div>
        {isPositive && (
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-sm font-medium">
            You are owed
          </div>
        )}
        <Link href="/settle" className="mt-4 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors">
          View settlements
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
