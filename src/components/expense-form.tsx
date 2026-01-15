"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switcher1 } from "@/components/ui/switcher1";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { CalendarIcon, Loader2, Users, User } from "lucide-react";
import { format } from "date-fns";
import { useUsers } from "@/hooks/use-users";
import { useCategories } from "@/hooks/use-categories";
import { useUser, useFirestore } from "@/firebase";
import { createPurchase, updatePurchase } from "@/lib/db";
import type { Purchase } from "@/lib/types";
import { useState, useEffect } from "react";
import { getCategoryIcon } from "@/lib/category-icons";
import { formatName } from "@/lib/format";
import { toast } from "@/lib/toast";

const formSchema = z.object({
  itemName: z.string().min(1, { message: "Item name is required." }),
  category: z.string().min(1, { message: "Category is required." }),
  amount: z.coerce.number().min(1, { message: "Amount must be greater than 0." }),
  date: z.date(),
  paymentType: z.enum(['single', 'multiple'], { required_error: "Payment type is required." }),
  paidById: z.string().optional(),
  paidByAmounts: z.record(z.string(), z.coerce.number()).optional(),
  customSplit: z.boolean().default(false),
  splitWith: z.array(z.string()).refine((value) => value.some((item) => item), {
    message: "You have to select at least one member to split with.",
  }),
}).refine((data) => {
  // For single payment, paidById is required
  if (data.paymentType === 'single') {
    return data.paidById && data.paidById.length > 0;
  }
  // For multiple payment, at least one paidByAmount is required
  if (data.paymentType === 'multiple') {
    if (!data.paidByAmounts) return false;
    const amounts = Object.values(data.paidByAmounts);
    return amounts.length > 0 && amounts.some(amt => amt > 0);
  }
  return true;
}, {
  message: "Payment information is required.",
  path: ["paidById"],
}).refine((data) => {
  // For multiple payment, sum of individual payments should equal total amount
  if (data.paymentType === 'multiple' && data.paidByAmounts) {
    const total = Object.values(data.paidByAmounts).reduce((sum, amt) => sum + amt, 0);
    return Math.abs(total - data.amount) < 0.01; // Allow for floating point precision
  }
  return true;
}, {
  message: "Total of individual payments must equal the expense amount.",
  path: ["amount"],
});

interface ExpenseFormProps {
  onSave?: (transaction: Purchase) => void;
  onSuccess?: () => void;
  expense?: Purchase;
  prefillData?: {
    itemName?: string;
  };
}

export function ExpenseForm({ onSave, onSuccess, expense, prefillData }: ExpenseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const { users, isLoading: usersLoading } = useUsers();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: expense
      ? {
          ...expense,
          date: new Date(expense.date),
          amount: expense.amount,
          paymentType: expense.paymentType || 'single',
          paidById: expense.paidById,
          paidByAmounts: expense.paidByAmounts || {},
          customSplit: expense.splitWith.length !== users.length,
        }
      : {
          itemName: prefillData?.itemName || "",
          category: "",
          amount: undefined as any,
          date: new Date(),
          paymentType: 'single' as const,
          paidById: user?.uid || "",
          paidByAmounts: {},
          customSplit: false,
          splitWith: [],
        },
  });
  
  // Update splitWith default when users load
  useEffect(() => {
    if (!expense && users.length > 0 && form.getValues('splitWith').length === 0) {
      form.setValue('splitWith', users.map((u) => u.id));
    }
  }, [users, expense, form]);

  const paymentType = form.watch("paymentType");
  const customSplit = form.watch("customSplit");
  const amount = form.watch("amount");
  const paidByAmounts = form.watch("paidByAmounts");

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    
    setIsLoading(true);
    try {
      // Prepare split members
      const splitWith = values.customSplit ? values.splitWith : (users.length > 0 ? users.map(u => u.id) : [user.uid]);
      
      if (expense) {
        // Update existing purchase - exclude id, type, paidById, and paymentType
        const updates: Partial<Omit<Purchase, 'id' | 'type' | 'paidById' | 'paymentType'>> = {
          itemName: values.itemName,
          category: values.category,
          amount: values.amount,
          date: values.date.toISOString(),
          splitWith: splitWith,
          ...(values.paymentType === 'multiple' && values.paidByAmounts ? { paidByAmounts: values.paidByAmounts } : {}),
        };
        await updatePurchase(firestore, user.uid, expense.id, updates);
        toast.success("Expense Updated", "Successfully updated the expense.");
      } else {
        // Create new purchase
        const purchaseData: Omit<Purchase, 'id'> = {
          type: 'purchase',
          itemName: values.itemName,
          category: values.category,
          amount: values.amount,
          date: values.date.toISOString(),
          paymentType: values.paymentType,
          paidById: values.paymentType === 'single' && values.paidById ? values.paidById : user.uid,
          splitWith: splitWith,
          ...(values.paymentType === 'multiple' && values.paidByAmounts ? { paidByAmounts: values.paidByAmounts } : {}),
        };
        const purchaseId = await createPurchase(firestore, user.uid, purchaseData);
        
        // Call the legacy onSave callback if provided
        if (onSave) {
          onSave({ id: purchaseId, ...purchaseData });
        }
      }
      
      // Call onSuccess if provided
      if (onSuccess) {
        onSuccess();
      }
      
      // Reset form only if not editing
      if (!expense) {
        form.reset({
          itemName: "",
          category: "",
          amount: undefined as any,
          date: new Date(),
          paymentType: 'single' as const,
          paidById: user?.uid || "",
          paidByAmounts: {},
          customSplit: false,
          splitWith: users.map(u => u.id),
        });
      }
    } catch (error: any) {
      console.error('Error saving purchase:', error);
      toast.error("Error", error?.message || "Failed to save expense. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (usersLoading || categoriesLoading) {
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
          name="itemName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Item Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Team Lunch" 
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
            name="amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="100" 
                    {...field}
                    className="transition-all focus:ring-2 focus:ring-primary/20"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                 <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map(cat => {
                        const Icon = getCategoryIcon(cat.name);
                        return (
                          <SelectItem key={cat.id} value={cat.name}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              <span>{cat.name}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Payment Type Selection */}
        <FormField
          control={form.control}
          name="paymentType"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel className="text-base">Payment Type</FormLabel>
              <FormDescription className="text-xs sm:text-sm">
                Choose how the expense was paid
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                  disabled={!!expense}
                >
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="single" id="single" />
                        <label
                          htmlFor="single"
                          className="flex-1 flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/5 transition-colors"
                        >
                          <User className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Single Payment</div>
                            <div className="text-xs text-muted-foreground">One person paid the full amount</div>
                          </div>
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="multiple" id="multiple" />
                        <label
                          htmlFor="multiple"
                          className="flex-1 flex items-center gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent/5 transition-colors"
                        >
                          <Users className="h-5 w-5 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-medium text-sm">Multiple Payments</div>
                            <div className="text-xs text-muted-foreground">Multiple people paid different amounts</div>
                          </div>
                        </label>
                      </div>
                    </FormControl>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          
          {/* Single Payer Selection - Only shown for single payment type */}
          {paymentType === 'single' && (
            <FormField
              control={form.control}
              name="paidById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Paid By</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
          )}
        </div>

        {/* Multiple Payers Input - Only shown for multiple payment type */}
        {paymentType === 'multiple' && (
          <div className="space-y-3 animate-fade-in">
            <div className="mb-2">
              <FormLabel className="text-base">Payment Distribution</FormLabel>
              <FormDescription className="text-xs sm:text-sm mt-1">
                Enter how much each person paid. Total must equal ₹{amount || 0}.
              </FormDescription>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {users.map((userItem) => {
                const currentAmount = paidByAmounts?.[userItem.id] || 0;
                return (
                  <FormField
                    key={userItem.id}
                    control={form.control}
                    name="paidByAmounts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-normal">{formatName(userItem.name)}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={currentAmount || ''}
                            onChange={(e) => {
                              const newValue = parseFloat(e.target.value) || 0;
                              field.onChange({
                                ...(field.value || {}),
                                [userItem.id]: newValue,
                              });
                            }}
                            className="transition-all focus:ring-2 focus:ring-primary/20"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                );
              })}
            </div>
            {/* Show total validation */}
            {typeof amount === 'number' && amount > 0 && paidByAmounts && (
              <div className={cn(
                "text-sm p-2 rounded-md",
                Math.abs(Object.values(paidByAmounts).reduce((sum, amt) => sum + (amt || 0), 0) - amount) < 0.01
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400"
              )}>
                Total paid: ₹{Object.values(paidByAmounts).reduce((sum, amt) => sum + (amt || 0), 0).toFixed(2)} / ₹{amount.toFixed(2)}
              </div>
            )}
            <FormMessage />
          </div>
        )}

        <FormField
          control={form.control}
          name="customSplit"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm hover:bg-accent/5 transition-colors">
              <div className="space-y-0.5">
                <FormLabel>Custom Split</FormLabel>
                <FormDescription className="text-xs sm:text-sm">
                  Split cost only among selected users.
                </FormDescription>
              </div>
              <FormControl>
                <Switcher1
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {customSplit && (
          <FormField
            control={form.control}
            name="splitWith"
            render={() => (
              <FormItem className="animate-fade-in">
                <div className="mb-4">
                  <FormLabel className="text-base">Split With</FormLabel>
                  <FormDescription className="text-xs sm:text-sm">
                    Select the users to split this expense with.
                  </FormDescription>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {users.map((item) => (
                    <FormField
                      key={item.id}
                      control={form.control}
                      name="splitWith"
                      render={({ field }) => {
                        return (
                          <FormItem
                            key={item.id}
                            className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border p-3 hover:bg-accent/5 transition-colors"
                          >
                            <FormControl>
                              <Checkbox
                                checked={field.value?.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  return checked
                                    ? field.onChange([...field.value, item.id])
                                    : field.onChange(
                                      field.value?.filter(
                                        (value) => value !== item.id
                                      )
                                    );
                                }}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer">
                              {formatName(item.name)}
                            </FormLabel>
                          </FormItem>
                        );
                      }}
                    />
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        
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
            <span>{expense ? "Save Changes" : "Add Expense"}</span>
          )}
        </Button>
      </form>
    </Form>
  );
}
