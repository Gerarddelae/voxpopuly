"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  ChartArea,
  Mail,
  Calendar,
  FileText,
  Users,
  Folder,
  HelpCircle,
  Settings,
  ChevronRight,
  ChevronDown,
  Sparkles,
  PanelLeftClose,
  MoreHorizontal,
  ChevronsUpDown,
  Atom,
  LogOut,
  UserCircle,
  CreditCard,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutGrid,
    href: "#",
    isActive: true,
  },
  {
    title: "Leads",
    icon: ChartArea,
    href: "#",
  },
  {
    title: "Emails",
    icon: Mail,
    href: "#",
  },
  {
    title: "Calendar",
    icon: Calendar,
    href: "#",
  },
  {
    title: "Tasks",
    icon: FileText,
    href: "#",
  },
  {
    title: "Contacts",
    icon: Users,
    href: "#",
  },
];

const folders = [
  { name: "TechCorp Upgrade", hasNotification: true },
  { name: "Fintra Expansion", hasNotification: true },
  { name: "Nova Redesign", hasNotification: true },
];

export function DashboardSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const [foldersOpen, setFoldersOpen] = React.useState(true);
  const router = useRouter();
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
      // unsubscribe listener
      try {
        listener.subscription.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, []);

  function getInitials(user: any) {
    if (!user) return "--";
    const name = user.user_metadata?.full_name || user.email || "";
    const parts = name.trim().split(" ").filter(Boolean);
    if (parts.length === 0) return "--";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  return (
    <Sidebar collapsible="offcanvas" className="lg:border-r-0!" {...props}>
      <SidebarHeader className="p-3 sm:p-4 lg:p-5 pb-0">
        <div className="flex items-center gap-2">
                    className="h-9 sm:h-[38px]"
          {/* Help Center and Settings removed from sidebar footer */}
                  >
                    <Link href={item.href}>
                      <item.icon
                        className={`size-4 sm:size-5 text-muted-foreground`}
                      />
                      <span
                        className={`text-sm text-muted-foreground`}
                      >
                        {item.title}
                      </span>
                      {item.isActive && (
                        <ChevronRight className="ml-auto size-4 text-muted-foreground opacity-60" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible open={foldersOpen} onOpenChange={setFoldersOpen}>
          <SidebarGroup className="p-0">
            <SidebarGroupLabel className="flex items-center justify-between px-0 text-[10px] sm:text-[11px] font-semibold tracking-wider text-muted-foreground">
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-pointer">
                  <ChevronDown
                    className={`size-3 sm:size-3.5 transition-transform ${
                      foldersOpen ? "" : "-rotate-90"
                    }`}
                  />
                  FOLDERS
                </div>
              </CollapsibleTrigger>
              <MoreHorizontal className="size-4 cursor-pointer hover:text-foreground transition-colors" />
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu className="mt-2">
                  {folders.map((folder) => (
                    <SidebarMenuItem key={folder.name}>
                            {folder.name}
                          </span>
                          {folder.hasNotification && (
                            <div className="size-1.5 rounded-full bg-[#6e3ff3] shrink-0" />
                          )}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="px-3 sm:px-4 lg:px-5 pb-3 sm:pb-4 lg:pb-5">
        {/* Help Center and Settings removed from sidebar footer */}

        <Button variant="outline" className="w-full mt-2" asChild>
          <Link
            href="https://square.lndev.me"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Globe className="size-4" />
            Placeholder
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors">
              <Avatar className="size-7 sm:size-8">
                {authUser?.user_metadata?.avatar_url ? (
                  <AvatarImage src={authUser.user_metadata.avatar_url} />
                ) : (
                  <AvatarFallback className="text-xs">{getInitials(authUser)}</AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs sm:text-sm">
                  {authUser?.user_metadata?.full_name || authUser?.email?.split("@")?.[0] || "User"}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                  {authUser?.email || "-"}
                </p>
              </div>
              <ChevronsUpDown className="size-4 text-muted-foreground shrink-0" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            {/* Profile removed from dropdown */}
            <DropdownMenuItem>
              <CreditCard className="size-4 mr-2" />
              Billing
            </DropdownMenuItem>
            {/* Settings removed from dropdown in sidebar */}
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
