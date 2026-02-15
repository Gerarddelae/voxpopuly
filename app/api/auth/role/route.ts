import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the current user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Try to get role from user metadata first
    if (user.user_metadata?.role) {
      return NextResponse.json({ role: user.user_metadata.role });
    }

    // Query profiles table for the role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error fetching profile:", profileError);
      return NextResponse.json({ role: "voter" });
    }

    return NextResponse.json({ role: profile?.role || "voter" });
  } catch (error) {
    console.error("Unexpected error in /api/auth/role:", error);
    return NextResponse.json(
      { error: "Internal server error", role: "voter" },
      { status: 500 }
    );
  }
}
