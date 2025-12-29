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
import type { Purchase } from "@/lib/types";
import { users } from "@/lib/data";
import { useMemo } from "react";

interface TotalSpendingChartProps {
  purchases: Purchase[];
}

const chartConfig = {
  amount: {
    label: "Amount",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export function TotalSpendingChart({ purchases }: TotalSpendingChartProps) {
  const chartData = useMemo(() => {
    const spendingByUser = users.map(user => {
      const totalSpent = purchases
        .filter(p => p.paidById === user.id)
        .reduce((sum, p) => sum + p.amount, 0);
      return {
        user: user.name,
        amount: totalSpent,
      };
    });
    return spendingByUser;
  }, [purchases]);

  const hasData = chartData.some(d => d.amount > 0);

  return (
    <Card className="h-full card-hover">
      <CardHeader>
        <CardTitle>Total Spending Per Person</CardTitle>
        <CardDescription>Who paid for what.</CardDescription>
      </CardHeader>
      <CardContent>
        {hasData ? (
          <ChartContainer config={chartConfig} className="h-[200px] sm:h-[250px] w-full">
            <BarChart accessibilityLayer data={chartData}>
              <CartesianGrid 
                vertical={false} 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))"
                opacity={0.3}
              />
              <XAxis
                dataKey="user"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => value.slice(0, 3)}
                className="text-xs"
              />
              <Tooltip
                cursor={{ fill: 'hsl(var(--accent) / 0.1)' }}
                content={<ChartTooltipContent indicator="dot" />}
              />
              <Bar
                dataKey="amount"
                fill="var(--color-amount)"
                radius={[8, 8, 0, 0]}
                animationDuration={800}
                animationBegin={0}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[200px] sm:h-[250px] text-center p-4">
            <p className="text-sm text-muted-foreground">No spending data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add expenses to see who paid</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
