import { DashboardHeader } from "@/components/dashboard/header";
import { DelegateSidebar } from "@/components/dashboard/delegate-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { requireRole } from "@/lib/auth/role-guard";

export default async function DelegateLayout({ children }: { children: React.ReactNode }) {
  await requireRole("delegate");
  
  return (
    <SidebarProvider className="bg-sidebar flex h-screen">
      <DelegateSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <DashboardHeader />
        <main className="p-6 flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
