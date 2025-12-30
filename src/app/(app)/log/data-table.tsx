"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { users } from "@/lib/data"
import { X } from "lucide-react"
import type { Transaction } from "@/lib/types"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
}

// Get unique categories from data
const getCategories = (data: Transaction[]): string[] => {
  const categories = new Set<string>();
  data.forEach((transaction) => {
    if (transaction.type === 'purchase') {
      categories.add(transaction.category);
    }
  });
  return Array.from(categories).sort();
};

export function DataTable<TData, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
      { id: 'date', desc: true }
  ])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  )
  const [globalFilter, setGlobalFilter] = React.useState("")
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all")
  const [paidByFilter, setPaidByFilter] = React.useState<string>("all")

  // Get available categories from the data
  const categories = React.useMemo(() => {
    return getCategories(data as Transaction[]);
  }, [data]);

  // Custom filter function
  const filteredData = React.useMemo(() => {
    let filtered = data as Transaction[];
    
    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((transaction) => 
        transaction.type === 'purchase' && transaction.category === categoryFilter
      );
    }
    
    // Filter by paid by
    if (paidByFilter !== "all") {
      filtered = filtered.filter((transaction) => 
        transaction.type === 'purchase' && transaction.paidById === paidByFilter
      );
    }
    
    return filtered;
  }, [data, categoryFilter, paidByFilter]);

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const transaction = row.original as Transaction;
      if (transaction.type === 'purchase') {
        return transaction.itemName.toLowerCase().includes(filterValue.toLowerCase());
      }
      return false;
    },
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  })

  return (
    <div className="rounded-lg border glassmorphic-card">
      <div className="p-4 space-y-4">
        {/* Search Input */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search expenses by name..."
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="max-w-sm"
          />
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Paid By Filter */}
          <Select value={paidByFilter} onValueChange={setPaidByFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Paid By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Members</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Clear Filters Button */}
          {(categoryFilter !== "all" || paidByFilter !== "all" || globalFilter !== "") && (
            <Button
              variant="ghost"
              onClick={() => {
                setCategoryFilter("all");
                setPaidByFilter("all");
                setGlobalFilter("");
              }}
              className="w-full sm:w-auto"
            >
              <X className="mr-2 h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => {
                return (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                )
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
       <div className="flex items-center justify-end space-x-2 p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
