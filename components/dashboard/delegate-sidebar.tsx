"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutGrid,
  MapPin,
  Users,
  Vote,
  Settings,
  HelpCircle,
  ChevronRight,
  ChevronsUpDown,
  LogOut,
  UserCircle,
  BarChart,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutGrid,
    href: "/dashboard/delegate",
  },
  {
    title: "My Voting Point",
    icon: MapPin,
    href: "/dashboard/delegate/voting-point",
  },
  {
    title: "Manage Voters",
    icon: Users,
    href: "/dashboard/delegate/voters",
  },
  {
    title: "Slates",
    icon: Vote,
    href: "/dashboard/delegate/slates",
  },
  {
    title: "Results",
    icon: BarChart,
    href: "/dashboard/delegate/results",
  },
];

export function DelegateSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const router = useRouter();
  const pathname = usePathname();
  const [authUser, setAuthUser] = React.useState<any>(null);

  async function handleLogout() {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Error signing out:", error);
        return;
      }
      router.push("/auth/login");
    } catch (err) {
      console.error("Unexpected sign out error:", err);
    }
  }

  React.useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        console.error("getUser error:", error);
        return;
      }
      if (mounted) setAuthUser(data?.user ?? null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      try {
        listener.subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  function getInitials(user: any) {
    if (!user) return "DL";
    const name = user.user_metadata?.full_name || user.email || "";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "DL";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return (
    <Sidebar collapsible="offcanvas" className="lg:border-r-0!" {...props}>
      <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
        <div className="flex items-center gap-2">
          <span role="img" aria-label="megaphone" className="text-lg sm:text-xl">
            📣
          </span>
          <span className="font-semibold text-base sm:text-lg">VoxPopuly Delegate</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 sm:px-4 lg:px-5">
        <SidebarGroup className="p-0">
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-9 sm:h-[38px]"
                    >
                      <Link href={item.href}>
                        <item.icon
                          className={`size-4 sm:size-5 text-muted-foreground`}
                        />
                        <span className={`text-sm text-muted-foreground`}>
                          {item.title}
                        </span>
                        {isActive && (
                          <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
              <Link href="/dashboard/delegate/help">
                <HelpCircle className="size-4 sm:size-5" />
                <span className="text-sm">Help Center</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="h-9 sm:h-[38px]">
              <Link href="/dashboard/delegate/settings">
                <Settings className="size-4 sm:size-5" />
                <span className="text-sm">Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors mt-2">
              <Avatar className="size-7 sm:size-8">
                {authUser?.user_metadata?.avatar_url ? (
                  <AvatarImage src={authUser.user_metadata.avatar_url} />
                ) : (
                  <AvatarFallback className="text-xs">{getInitials(authUser)}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm">
                  {authUser?.user_metadata?.full_name || authUser?.email?.split("@")?.[0] || "Delegate"}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {authUser?.email || "-"}
                </p>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuItem>
              <UserCircle className="size-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="size-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="size-4 mr-2" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
