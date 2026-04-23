"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useUsers } from "@/hooks/use-users";
import { useUser, useFirestore } from "@/firebase";
import { createSettlement, updateSettlement } from "@/lib/db/settlements";
import type { Settlement } from "@/lib/types";
import { useState } from "react";
import { formatName } from "@/lib/format";
import { toast } from "@/lib/toast";

const formSchema = z.object({
  amount: z.coerce.number().min(0.01, { message: "Amount must be greater than 0." }),
  date: z.date(),
  fromId: z.string().min(1, { message: "From user is required." }),
  toId: z.string().min(1, { message: "To user is required." }),
});

interface SettlementFormProps {
  onSuccess?: () => void;
  settlement?: Settlement;
}

export function SettlementForm({ onSuccess, settlement }: SettlementFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { users, isLoading: usersLoading } = useUsers();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: settlement
      ? {
          ...settlement,
          date: new Date(settlement.date),
          amount: settlement.amount,
        }
      : {
          amount: 0,
          date: new Date(),
          fromId: user?.uid || "",
          toId: "",
        },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    
    setIsLoading(true);
    try {
      if (settlement) {
        // Update existing settlement - exclude id, type, and fromId
        const updates: Partial<Omit<Settlement, 'id' | 'type' | 'fromId'>> = {
          toId: values.toId,
          amount: values.amount,
          date: values.date.toISOString(),
        };
        await updateSettlement(firestore, settlement.fromId, settlement.id, updates);
      } else {
        // Create new settlement
        const settlementData: Omit<Settlement, 'id'> = {
          type: 'settlement',
          ...values,
          date: values.date.toISOString(),
        };
        await createSettlement(firestore, user.uid, settlementData);
      }
      
      // Call onSuccess if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form only if not editing
      if (!settlement) {
        form.reset();
      }
    } catch (error: any) {
      console.error('Error saving settlement:', error);
      
      // Show error toast to user
      if (error?.message?.includes('PERMISSION_DENIED')) {
        toast.error("Action Denied", "You can only modify your own settlements.");
      } else {
        toast.error("Error", `Failed to ${settlement ? 'update' : 'create'} settlement. Please try again.`);
      }
    } finally {
      setIsLoading(false);
    }
  }

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input 
                  type="number"
                  step="0.01"
                  placeholder="100" 
                  {...field}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fromId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>From</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={settlement != null}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Who paid?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map(user => <SelectItem key={user.id} value={user.id}>{formatName(user.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="toId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>To</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="To whom?" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {users.map(user => <SelectItem key={user.id} value={user.id}>{formatName(user.name)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Date</FormLabel>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal transition-all focus:ring-2 focus:ring-primary/20",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                  <div className="pointer-events-auto">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          field.onChange(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button 
          type="submit" 
          className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <span>{settlement ? "Save Changes" : "Add Settlement"}</span>
          )}
        </Button>
      </form>
    </Form>
  );
}
