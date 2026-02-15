import { DashboardHeader } from "@/components/dashboard/header";
import { VoterSidebar } from "@/components/dashboard/voter-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { requireRole } from "@/lib/auth/role-guard";

export default async function VoterLayout({ children }: { children: React.ReactNode }) {
  await requireRole("voter");
  
  return (
    <SidebarProvider className="bg-sidebar flex h-screen">
      <VoterSidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-background">
        <DashboardHeader />
        <main className="p-6 flex-1 overflow-auto">{children}</main>
      </div>
    </SidebarProvider>
  );
}
