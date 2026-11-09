import "server-only";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

export const staffRoles = ["admin", "supervisor", "editor"] as const;
export type StaffRole = (typeof staffRoles)[number];

export async function getStaff() {
  const supabase = await createServerSupabase();
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("id,display_name,role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !staffRoles.includes(profile.role)) return null;
  return {
    supabase,
    user,
    role: profile.role as StaffRole,
    name: (profile.display_name as string | null) || user.email || "فريق المدرسة",
    canManage: profile.role === "admin" || profile.role === "supervisor",
    isAdmin: profile.role === "admin",
  };
}

export async function requireStaff() {
  const staff = await getStaff();
  if (!staff) redirect("/admin/login");
  return staff;
}
