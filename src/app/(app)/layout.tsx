import { Header } from "@/components/layout/header";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <SidebarProvider>
        <div className="flex min-h-screen w-full relative">
          <SidebarNav />
          <main className="flex flex-1 flex-col w-full min-w-0 relative z-10">
            <Header />
            <div className="flex-1 p-3 sm:p-4 md:p-6 lg:p-8 overflow-x-hidden">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
