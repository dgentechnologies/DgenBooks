"use client";

import React, { useState, useMemo } from "react";
import { useUser, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, IndianRupee, Wallet, Building2, ArrowUpRight, ArrowDownLeft, TrendingUp, Briefcase } from "lucide-react";
import { updateProfile } from "firebase/auth";
import { toast } from "@/lib/toast";
import { useUserPurchases } from "@/hooks/use-purchases";
import { useUserSettlements } from "@/hooks/use-settlements";
import { useUsers } from "@/hooks/use-users";
import type { Transaction } from "@/lib/types";
import { calculateBalances } from "@/lib/logic";

export default function ProfilePage() {
  const { user } = useUser();
  const auth = useAuth();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL || "");
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch data for stats
  const { data: purchases, isLoading: purchasesLoading } = useUserPurchases();
  const { data: settlements, isLoading: settlementsLoading } = useUserSettlements();
  const { users, isLoading: usersLoading } = useUsers();

  // Calculate stats
  const { 
    totalSpent, 
    currentBalance, 
    totalCompanyExpenses,
    settlementsPaid,
    settlementsReceived,
    netExpense,
    totalCompanyInvestment
  } = useMemo(() => {
    if (!user || !purchases || !settlements) {
      return { 
        totalSpent: 0, 
        currentBalance: 0, 
        totalCompanyExpenses: 0,
        settlementsPaid: 0,
        settlementsReceived: 0,
        netExpense: 0,
        totalCompanyInvestment: 0
      };
    }

    // Combine purchases and settlements into transactions
    const transactions: Transaction[] = [...purchases, ...settlements];
    
    // Calculate total spent including multi-payer expenses (excluding company expenses)
    const spent = purchases.reduce((sum, p) => {
      // Skip company-paid expenses
      if (p.paidByCompany === true || p.paymentType === 'company') {
        return sum;
      }
      
      // For single-payer expenses
      if (p.paymentType !== 'multiple' && p.paidById === user.uid) {
        return sum + p.amount;
      }
      
      // For multi-payer expenses, add the amount this user paid
      if (p.paymentType === 'multiple' && p.paidByAmounts && p.paidByAmounts[user.uid]) {
        return sum + p.paidByAmounts[user.uid];
      }
      
      return sum;
    }, 0);
    
    // Calculate total company expenses
    const companyExpenses = purchases.reduce((sum, p) => {
      if (p.paidByCompany === true || p.paymentType === 'company') {
        return sum + p.amount;
      }
      return sum;
    }, 0);

    // Calculate settlements paid by current user to others
    const paidToOthers = settlements.reduce((sum, s) => {
      if (s.fromId === user.uid) {
        return sum + s.amount;
      }
      return sum;
    }, 0);

    // Calculate settlements received by current user from others
    const receivedFromOthers = settlements.reduce((sum, s) => {
      if (s.toId === user.uid) {
        return sum + s.amount;
      }
      return sum;
    }, 0);

    // Calculate net expense: purchases + settlements paid - settlements received
    const netExpense = spent + paidToOthers - receivedFromOthers;

    // Calculate total company investment: sum of all purchases (includes company-paid and user-paid)
    const totalCompanyInvestment = purchases.reduce((sum, p) => sum + p.amount, 0);

    // Calculate current balance
    const { netBalances } = calculateBalances(transactions, users);
    const balance = netBalances?.get(user.uid) || 0;

    return { 
      totalSpent: spent, 
      currentBalance: balance, 
      totalCompanyExpenses: companyExpenses,
      settlementsPaid: paidToOthers,
      settlementsReceived: receivedFromOthers,
      netExpense,
      totalCompanyInvestment
    };
  }, [user, purchases, settlements, users]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsUpdating(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName || null,
        photoURL: photoURL || null,
      });
      toast.success("Profile Updated", "Your profile has been successfully updated.");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Update Failed", "Failed to update your profile. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const isStatsLoading = purchasesLoading || settlementsLoading || usersLoading;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const userInitial = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="mb-6">
        <h2 className="text-3xl md:text-4xl font-bold font-headline bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-2">
          Your Profile
        </h2>
        <p className="text-muted-foreground/80 text-base">
          Manage your account details and view your financial stats.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-3">
        {/* Total Spent Card */}
        <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Spent
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-white">
                ₹{totalSpent.toLocaleString("en-IN")}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total expenses paid by you
            </p>
          </CardContent>
        </Card>

        {/* Current Balance Card */}
        <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.1s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current Balance
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className={`text-2xl font-bold ${currentBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {currentBalance >= 0 ? '+' : ''}₹{currentBalance.toLocaleString("en-IN")}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {currentBalance >= 0 ? "Others owe you" : "You owe others"}
            </p>
          </CardContent>
        </Card>
        
        {/* Company Expenses Card */}
        <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.2s'}}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Company Expenses
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isStatsLoading ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <div className="text-2xl font-bold text-blue-400">
                ₹{totalCompanyExpenses.toLocaleString("en-IN")}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              Total company-paid expenses
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settlement Statistics Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Settlement Details</h3>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Amount Paid to Others Card */}
          <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.3s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Paid to Others
              </CardTitle>
              <ArrowUpRight className="h-4 w-4 text-red-400" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold text-red-400">
                  ₹{settlementsPaid.toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Total settlements paid to others
              </p>
            </CardContent>
          </Card>

          {/* Amount Received from Others Card */}
          <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.4s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Received from Others
              </CardTitle>
              <ArrowDownLeft className="h-4 w-4 text-green-400" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold text-green-400">
                  ₹{settlementsReceived.toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Total settlements received from others
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Total Investment Statistics Section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-4 text-white">Investment Summary</h3>
        <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2">
          {/* Net Expense Card */}
          <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.5s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Your Net Expense
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-400" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold text-purple-400">
                  ₹{netExpense.toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Purchases + paid - received
              </p>
            </CardContent>
          </Card>

          {/* Total Company Investment Card */}
          <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.6s'}}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Company Investment
              </CardTitle>
              <Briefcase className="h-4 w-4 text-amber-400" />
            </CardHeader>
            <CardContent>
              {isStatsLoading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <div className="text-2xl font-bold text-amber-400">
                  ₹{totalCompanyInvestment.toLocaleString("en-IN")}
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Total of all purchases
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Profile Details Card */}
      <Card className="bg-slate-950/50 backdrop-blur-xl border-white/10 shadow-2xl animate-slide-in-right" style={{animationDelay: '0.7s'}}>
        <CardHeader>
          <CardTitle className="font-headline text-xl flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Details
          </CardTitle>
          <CardDescription>
            Update your display name and profile picture.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Avatar Preview */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border-2 border-primary/20">
                <AvatarImage src={photoURL || user.photoURL || undefined} alt={displayName || "User"} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-2xl">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Profile Picture</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Enter a URL for your profile picture
                </p>
              </div>
            </div>

            {/* Display Name Input */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="bg-slate-900/50 border-white/10"
              />
            </div>

            {/* Photo URL Input */}
            <div className="space-y-2">
              <Label htmlFor="photoURL">Profile Picture URL</Label>
              <Input
                id="photoURL"
                type="url"
                placeholder="https://example.com/avatar.jpg"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="bg-slate-900/50 border-white/10"
              />
            </div>

            {/* Email (Read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={user.email || ""}
                disabled
                className="bg-slate-900/30 border-white/10 opacity-60"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            {/* Update Button */}
            <Button
              type="submit"
              disabled={isUpdating}
              className="w-full sm:w-auto bg-gradient-to-r from-primary to-accent hover:opacity-90 transition-all"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Profile"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
