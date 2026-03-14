"use client";
// src/components/admin/DashboardNav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ClipboardList,
  BarChart2,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/dashboard/surveys", label: "Encuestas", icon: ClipboardList },
  { href: "/dashboard/analytics", label: "Resultados", icon: BarChart2 },
];

interface Props {
  user: { name?: string | null; email?: string | null };
}

export function DashboardNav({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-white/[0.06] flex flex-col bg-torx-dark-2 shrink-0">
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/[0.06]">
        <div className="w-1.5 h-1.5 rounded-full bg-torx-red" />
        <span className="font-display text-lg tracking-widest text-white">TORX</span>
        <span className="text-white/20 text-xs">·</span>
        <span className="text-[10px] text-white/35 font-semibold tracking-widest uppercase">Survey</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group",
                isActive
                  ? "bg-torx-red/10 text-torx-red border border-torx-red/20"
                  : "text-white/40 hover:text-white/80 hover:bg-white/5"
              )}
            >
              <Icon size={16} className={isActive ? "text-torx-red" : "text-white/30 group-hover:text-white/60"} />
              {label}
              {isActive && <ChevronRight size={12} className="ml-auto text-torx-red/60" />}
            </Link>
          );
        })}
      </nav>

      {/* User / Logout */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
          <div className="w-7 h-7 rounded-full bg-torx-red flex items-center justify-center text-[11px] font-semibold text-white shrink-0">
            {(user.name ?? user.email ?? "?")[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{user.name}</p>
            <p className="text-[10px] text-white/30 truncate">{user.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all duration-150"
        >
          <LogOut size={15} />
          Salir
        </button>
      </div>
    </aside>
  );
}
