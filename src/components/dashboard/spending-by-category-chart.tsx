"use client";

import { TrendingUp } from "lucide-react";
import {
  Pie,
  PieChart,
  Cell,
  Tooltip,
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
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { Purchase } from "@/lib/types";
import { useMemo } from "react";

interface SpendingByCategoryChartProps {
  purchases: Purchase[];
}

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export function SpendingByCategoryChart({ purchases }: SpendingByCategoryChartProps) {
  const { chartData, chartConfig } = useMemo(() => {
    const categoryTotals = purchases.reduce((acc, purchase) => {
      acc[purchase.category] = (acc[purchase.category] || 0) + purchase.amount;
      return acc;
    }, {} as Record<string, number>);

    const data = Object.entries(categoryTotals).map(([category, total]) => ({
      name: category,
      value: total,
    })).sort((a, b) => b.value - a.value);

    const config: ChartConfig = data.reduce((acc, item, index) => {
      acc[item.name] = {
        label: item.name,
        color: COLORS[index % COLORS.length],
      };
      return acc;
    }, {} as ChartConfig);

    return { chartData: data, chartConfig: config };
  }, [purchases]);

  const totalSpent = useMemo(() => chartData.reduce((acc, curr) => acc + curr.value, 0), [chartData]);

  return (
    <Card className="flex flex-col h-full card-hover">
      <CardHeader className="items-center pb-0">
        <CardTitle className="text-center">Spending by Category</CardTitle>
        <CardDescription className="text-center">Donut chart of your team's expenses.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0 flex items-center justify-center">
        {chartData.length > 0 ? (
          <ChartContainer
            config={chartConfig}
            className="mx-auto aspect-square max-h-[250px] sm:max-h-[300px] w-full"
          >
            <PieChart>
               <Tooltip
                cursor={false}
                content={<ChartTooltipContent hideLabel nameKey="name" />}
              />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                outerRadius={80}
                strokeWidth={5}
                animationDuration={800}
                animationBegin={0}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={chartConfig[entry.name]?.color}
                    className="hover:opacity-80 transition-opacity cursor-pointer"
                  />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-[250px] text-center p-4">
            <p className="text-sm text-muted-foreground">No spending data yet</p>
            <p className="text-xs text-muted-foreground mt-1">Add expenses to see the breakdown</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm pt-4">
        <div className="flex items-center gap-2 font-medium leading-none">
          Total spent this period: ₹{totalSpent.toLocaleString('en-IN')}
          <TrendingUp className="h-4 w-4 text-primary" />
        </div>
        <div className="leading-none text-muted-foreground text-center">
          Showing total spending for all purchases
        </div>
      </CardFooter>
    </Card>
  );
}
