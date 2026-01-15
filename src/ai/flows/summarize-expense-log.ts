'use server';

/**
 * @fileOverview Summarizes user spending for a given date range using AI.
 *
 * - summarizeExpenseLog -  A function that generates a summary of user spending.
 * - SummarizeExpenseLogInput - The input type for the summarizeExpenseLog function.
 * - SummarizeExpenseLogOutput - The return type for the summarizeExpenseLog function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeExpenseLogInputSchema = z.object({
  startDate: z.string().describe('The start date for the expense log summary.'),
  endDate: z.string().describe('The end date for the expense log summary.'),
  expenseLog: z.string().describe('The expense log data.'),
  user: z.string().describe('The user requesting the summary.'),
});
export type SummarizeExpenseLogInput = z.infer<typeof SummarizeExpenseLogInputSchema>;

const SummarizeExpenseLogOutputSchema = z.object({
  summary: z.string().describe('A summary of the user spending for the given date range.'),
});
export type SummarizeExpenseLogOutput = z.infer<typeof SummarizeExpenseLogOutputSchema>;

export async function summarizeExpenseLog(input: SummarizeExpenseLogInput): Promise<SummarizeExpenseLogOutput> {
  return summarizeExpenseLogFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeExpenseLogPrompt',
  input: {schema: SummarizeExpenseLogInputSchema},
  output: {schema: SummarizeExpenseLogOutputSchema},
  prompt: `You are an AI assistant helping users understand their spending habits.

  Summarize the following expense log for the user {{user}} between {{startDate}} and {{endDate}}:

  Expense Log:
  {{expenseLog}}
  `,
});

const summarizeExpenseLogFlow = ai.defineFlow(
  {
    name: 'summarizeExpenseLogFlow',
    inputSchema: SummarizeExpenseLogInputSchema,
    outputSchema: SummarizeExpenseLogOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
