"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarTrigger } from "../ui/sidebar";
import { LogOut } from "lucide-react";
import { useUser, useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { toast } from "@/lib/toast";

function getTitleFromPathname(pathname: string): string {
  if (pathname === "/") return "Dashboard";
  if (pathname.startsWith("/log")) return "Expense Log";
  if (pathname.startsWith("/settle")) return "Settle Up";
  if (pathname.startsWith("/profile")) return "Profile";
  if (pathname.startsWith("/settings")) return "Settings";
  if (pathname.startsWith("/requests")) return "Purchase List";
  return "DgenBooks";
}

export function Header() {
  const pathname = usePathname();
  const title = getTitleFromPathname(pathname);
  const { user } = useUser();
  const auth = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success("Logged out", "You have been successfully logged out.");
      router.push("/auth/login");
    } catch (error) {
      toast.error("Error", "Failed to log out");
    }
  };

  const userInitial = user?.email?.charAt(0).toUpperCase() || "U";
  const userName = user?.displayName || user?.email || "User";

  return (
    <header className="sticky top-0 z-10 flex min-h-[5rem] items-center gap-2 sm:gap-4 border-b bg-background/80 px-3 sm:px-4 py-4 backdrop-blur-lg md:px-6 transition-all mobile-safe-area-top mobile-safe-area-x">
      <div className="md:hidden">
        <div className="rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm p-1.5">
          <SidebarTrigger className="h-8 w-8" />
        </div>
      </div>
      <h1 className="text-lg sm:text-xl md:text-2xl font-semibold font-headline truncate flex-1 md:flex-none">{title}</h1>
      <div className="ml-auto flex items-center gap-2 sm:gap-4">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all"
          onClick={() =>
            window.open(
              "https://dgen-access-control.vercel.app/",
              "_blank",
              "toolbar=no,menubar=no,scrollbars=yes,resizable=yes"
            )
          }
          title="Dgen Access"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://dgen-access-control.vercel.app/favicon.ico"
            alt="Dgen Access"
            className="h-4 w-4 rounded-sm"
          />
          <span className="hidden sm:inline text-xs font-medium">Access</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:ring-2 hover:ring-primary/20 transition-all">
              <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                <AvatarImage src={user?.photoURL || undefined} alt={userName} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {userInitial}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 animate-fade-in">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{userName}</p>
                <p className="text-xs leading-none text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/profile")}>
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/settings")}>
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
