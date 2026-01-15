"use client";

import { TrendingUp } from "lucide-react";
import {
  Pie,
  PieChart,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { Purchase } from "@/lib/types";
import { useMemo } from "react";

interface SpendingByCategoryChartProps {
  purchases: Purchase[];
}

// Premium color palette: Purple, Cyan, Green
const COLORS = ["#8b5cf6", "#06b6d4", "#10b981"];

const chartConfig = {
  value: {
    label: "Amount",
  },
} satisfies ChartConfig;

export function SpendingByCategoryChart({ purchases }: SpendingByCategoryChartProps) {
  const chartData = useMemo(() => {
    const categoryTotals = purchases.reduce((acc, purchase) => {
      acc[purchase.category] = (acc[purchase.category] || 0) + purchase.amount;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(categoryTotals).map(([category, total], index) => ({
      name: category,
      value: total,
      fill: COLORS[index % COLORS.length],
    })).sort((a, b) => b.value - a.value);

    return data;
  }, [purchases]);

  const totalSpent = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);

  return (
    <Card className="flex flex-col h-full">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription className="text-slate-400">Breakdown of expenses by category</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        {chartData.length > 0 ? (
          <ChartContainer config={chartConfig} className="h-[280px] sm:h-[300px] w-full">
            <PieChart>
              <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="name" />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="45%"
                innerRadius={55}
                outerRadius={85}
                strokeWidth={4}
                stroke="rgba(15, 23, 42, 0.9)"
                animationDuration={800}
                animationBegin={0}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
              <Legend 
                verticalAlign="bottom" 
                align="center"
                layout="horizontal"
                iconType="circle"
                wrapperStyle={{ paddingTop: '15px' }}
              />
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
            <div className="rounded-full bg-muted/50 p-4 mb-3">
              <svg className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-muted-foreground">No spending data yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Add expenses to see the breakdown</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none text-white">
          Total: ₹{totalSpent.toLocaleString('en-IN')}
          <TrendingUp className="h-4 w-4 text-emerald-400" />
        </div>
      </CardFooter>
    </Card>
  );
}
