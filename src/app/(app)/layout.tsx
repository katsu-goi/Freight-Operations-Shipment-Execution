import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { aiEnabled } from "@/lib/ai";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const supabase = await createClient();

  const { count } = await supabase
    .from("containers")
    .select("*", { count: "exact", head: true });

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 antialiased overflow-hidden">
      <Sidebar role={profile.role} containerCount={count ?? 0} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <Header profile={profile} aiEnabled={aiEnabled()} />
        <main className="flex-1 overflow-y-auto p-6 scroll-thin">{children}</main>
      </div>
    </div>
  );
}
