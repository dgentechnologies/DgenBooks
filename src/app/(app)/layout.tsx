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
        <div className="flex min-h-screen">
          <SidebarNav />
          <main className="flex flex-1 flex-col">
            <Header />
            <div className="flex-1 p-4 md:p-8">{children}</div>
          </main>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
