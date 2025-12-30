"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useAuth, useFirestore } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GoogleIcon } from "@/components/icons/google-icon";
import { createUserProfile } from "@/lib/db";
import { getFullNameFromNickname } from "@/lib/user-mapping";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Error",
        description: "Name is required",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Map nickname to full name if applicable
      const fullName = getFullNameFromNickname(name.trim());
      
      // Create user profile in Firestore
      await createUserProfile(firestore, userCredential.user.uid, {
        name: fullName,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userCredential.user.uid}`,
      });
      
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      router.push("/");
    } catch (error) {
      let errorMessage = "Failed to create account";
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: string }).code;
        if (code === "auth/email-already-in-use") {
          errorMessage = "Email already in use";
        } else if (code === "auth/invalid-email") {
          errorMessage = "Invalid email address";
        } else if (code === "auth/weak-password") {
          errorMessage = "Password is too weak";
        }
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      
      // Map displayName to full name if applicable
      const displayName = result.user.displayName || 'User';
      const fullName = getFullNameFromNickname(displayName);
      
      // Create user profile in Firestore if it doesn't exist
      await createUserProfile(firestore, result.user.uid, {
        name: fullName,
        avatar: result.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.uid}`,
      });
      
      toast({
        title: "Success",
        description: "Successfully signed in with Google!",
      });
      router.push("/");
    } catch (error) {
      let errorMessage = "Failed to sign in with Google";
      if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: string }).code;
        if (code === "auth/popup-closed-by-user") {
          errorMessage = "Sign-in popup was closed";
        } else if (code === "auth/cancelled-popup-request") {
          errorMessage = "Sign-in was cancelled";
        } else if (code === "auth/popup-blocked") {
          errorMessage = "Sign-in popup was blocked by your browser";
        }
      }
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-4 bg-background animate-fade-in">
      <Card className="w-full max-w-md card-hover gradient-overlay">
        <CardHeader className="space-y-4">
          <div className="flex justify-center animate-fade-in">
            <Image src="/images/logo.png" alt="DgenBooks Logo" width={48} height={48} className="h-12 w-12" />
          </div>
          <CardTitle className="text-center text-2xl sm:text-3xl font-headline">Create Account</CardTitle>
          <CardDescription className="text-center text-sm sm:text-base">
            Sign up to get started with DgenBooks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSignup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
              <p className="text-xs text-muted-foreground">At least 6 characters</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                className="transition-all focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <Button 
              type="submit" 
              className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]" 
              disabled={isLoading}
            >
              {isLoading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            onClick={handleGoogleSignup}
            disabled={isLoading}
          >
            <GoogleIcon className="mr-2 h-4 w-4" />
            Google
          </Button>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
