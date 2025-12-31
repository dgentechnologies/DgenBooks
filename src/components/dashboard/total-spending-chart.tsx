"use client";

import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Purchase, User } from "@/lib/types";
import { useMemo } from "react";

interface TotalSpendingChartProps {
  purchases: Purchase[];
  users: User[];
}

const chartConfig = {
  amount: {
    label: "Amount",
    color: "#8b5cf6",
  },
} satisfies ChartConfig;

export function TotalSpendingChart({ purchases, users }: TotalSpendingChartProps) {
  const chartData = useMemo(() => {
    const spendingByUser = users.map((user) => {
      const totalSpent = purchases
        .filter(p => p.paidById === user.id)
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        user: user.name,
        amount: totalSpent,
        fill: "url(#purpleGradient)",
      };
    });
    return spendingByUser;
  }, [purchases, users]);

  const hasData = purchases.length > 0;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Total Spending (Team)</CardTitle>
        <CardDescription className="text-slate-400">Who paid for what</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <defs>
                <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.6} />
                </linearGradient>
              </defs>
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                stroke="rgba(148, 163, 184, 0.1)"
                opacity={0.2}
              />
              <XAxis
                dataKey="user"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                className="text-xs"
                angle={-15}
                textAnchor="end"
                height={60}
                stroke="#94a3b8"
              />
              <Tooltip
                cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar
                dataKey="amount"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
                animationBegin={0}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] text-center p-4">
            <div className="rounded-full bg-muted/50 p-4 mb-3">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">No spending data yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add expenses to see who paid</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
