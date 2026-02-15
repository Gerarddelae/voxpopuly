import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardHeader } from "@/components/dashboard/header";
import { DashboardContent } from "@/components/dashboard/content";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardPage() {
  return (
    <SidebarProvider className="bg-sidebar">
      <DashboardSidebar />
      <div className="h-svh overflow-hidden lg:p-2 w-full flex">
        <div className="lg:border lg:rounded-md overflow-hidden flex flex-col flex-1 min-h-0 bg-container bg-background">
          <DashboardHeader />
          <div className="flex-1 min-h-0">
            <DashboardContent />
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}
