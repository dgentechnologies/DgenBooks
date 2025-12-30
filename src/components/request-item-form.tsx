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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useUser, useFirestore } from "@/firebase";
import { createPurchaseRequest } from "@/lib/db";

const formSchema = z.object({
  itemName: z.string().min(1, { message: "Item name is required." }),
  priority: z.enum(['Urgent', 'Standard'], {
    required_error: "Please select a priority level.",
  }),
  estimatedCost: z.coerce.number().min(0).optional().or(z.literal('')),
});

interface RequestItemFormProps {
  onSuccess?: () => void;
}

export function RequestItemForm({ onSuccess }: RequestItemFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      itemName: "",
      priority: "Standard",
      estimatedCost: undefined,
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const requestData = {
        itemName: values.itemName,
        requestedBy: user.uid,
        priority: values.priority,
        status: 'Pending' as const,
        estimatedCost: values.estimatedCost ? Number(values.estimatedCost) : undefined,
      };

      await createPurchaseRequest(firestore, user.uid, requestData);
      
      if (onSuccess) {
        onSuccess();
      }
      
      form.reset();
    } catch (error) {
      console.error('Error creating purchase request:', error);
    } finally {
      setIsLoading(false);
    }
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
                  placeholder="Office Supplies" 
                  {...field} 
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormDescription className="text-xs">
                What needs to be purchased?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-accent/5 transition-colors">
                    <FormControl>
                      <RadioGroupItem value="Urgent" />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="font-normal cursor-pointer">
                        Urgent
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Needs to be purchased as soon as possible
                      </FormDescription>
                    </div>
                  </FormItem>
                  <FormItem className="flex items-center space-x-3 space-y-0 rounded-lg border p-3 hover:bg-accent/5 transition-colors">
                    <FormControl>
                      <RadioGroupItem value="Standard" />
                    </FormControl>
                    <div className="flex-1">
                      <FormLabel className="font-normal cursor-pointer">
                        Standard
                      </FormLabel>
                      <FormDescription className="text-xs">
                        Can be purchased when convenient
                      </FormDescription>
                    </div>
                  </FormItem>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="estimatedCost"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Estimated Cost (Optional)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="50" 
                  {...field}
                  value={field.value ?? ''}
                  className="transition-all focus:ring-2 focus:ring-primary/20"
                />
              </FormControl>
              <FormDescription className="text-xs">
                Approximate cost if known
              </FormDescription>
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
              <span>Submitting...</span>
            </>
          ) : (
            <span>Add Request</span>
          )}
        </Button>
      </form>
    </Form>
  );
}
