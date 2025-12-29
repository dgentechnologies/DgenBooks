"use client"

import { ColumnDef } from "@tanstack/react-table"
import type { Transaction, User } from "@/lib/types"
import { users } from "@/lib/data"
import { Badge } from "@/components/ui/badge"
import { ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const getUser = (id: string): User | undefined => users.find(u => u.id === id);

export const columns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      )
    },
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return <div className="font-medium">{date.toLocaleDateString()}</div>
    },
  },
  {
    header: "Item",
    cell: ({ row }) => {
      const transaction = row.original;
      if (transaction.type === 'purchase') {
        return (
            <div>
                <div className="font-medium">{transaction.itemName}</div>
                <div className="text-sm text-muted-foreground">{transaction.category}</div>
            </div>
        )
      }
      return <div className="font-medium text-primary">Settlement</div>;
    },
  },
   {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <div className="text-right">
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
        </div>
      )
    },
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("amount"))
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount)
 
      return <div className="text-right font-medium">{formatted}</div>
    },
  },
  {
    header: "Paid By / From",
    cell: ({ row }) => {
      const transaction = row.original;
      const user = getUser(transaction.type === 'purchase' ? transaction.paidById : transaction.fromId);
      if (!user) return null;
      return (
        <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
        </div>
      )
    }
  },
  {
    header: "Split / To",
    cell: ({ row }) => {
        const transaction = row.original;
        if (transaction.type === 'purchase') {
            if (transaction.splitWith.length === users.length) {
                return <Badge variant="secondary">All Members</Badge>
            }
            return <Badge variant="outline">{transaction.splitWith.length} Members</Badge>
        }

        const user = getUser(transaction.toId);
        if (!user) return null;
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <span>{user.name}</span>
        </div>
        )
    }
  },
]
