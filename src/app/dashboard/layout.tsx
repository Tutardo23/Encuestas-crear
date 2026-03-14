// src/app/dashboard/layout.tsx
import { requireAuth } from "@/lib/auth";
import { DashboardNav } from "@/components/admin/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex min-h-screen bg-torx-dark">
      <DashboardNav user={session.user} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
