import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getUserRole(): Promise<string> {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Try user metadata first
  if (user.user_metadata?.role) {
    return user.user_metadata.role;
  }

  // Query profiles table
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return profile?.role || "voter";
}

export async function requireRole(requiredRole: string) {
  const role = await getUserRole();
  
  if (role !== requiredRole) {
    // Redirect to the correct dashboard based on actual role
    if (role === "admin") redirect("/dashboard/admin");
    if (role === "delegate") redirect("/dashboard/delegate");
    redirect("/dashboard/voter");
  }
}
