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

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Total Spending Per Person</CardTitle>
        <CardDescription>Who paid for what.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart accessibilityLayer data={chartData}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="user"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <Tooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Bar
              dataKey="amount"
              fill="var(--color-amount)"
              radius={8}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
