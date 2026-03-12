'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Phone,
  Megaphone,
  ArrowLeft,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard', label: 'DASHBOARD', icon: LayoutDashboard },
  { href: '/call', label: 'LIVE CALL', icon: Phone },
  { href: '/campaigns', label: 'CAMPAIGNS', icon: Megaphone },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r-[2px] border-white/20 bg-black/40 backdrop-blur-3xl">
      {/* Logo */}
      <div className="flex h-24 items-center justify-center border-b-[2px] border-white/20">
        <Link href="/" className="text-3xl font-black tracking-tighter uppercase text-white hover:opacity-75 transition-opacity">
          SARGAM
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4 p-6 overflow-y-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">
          SYSTEM MENU
        </p>
        <div className="space-y-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-4 py-4 text-sm font-bold tracking-widest transition-all ${isActive
                  ? 'glass-brutal text-white'
                  : 'text-zinc-500 hover:text-white border-[1px] border-transparent hover:border-white/20'
                  }`}
              >
                <Icon className="h-5 w-5 stroke-[2.5]" />
                {item.label}
                {item.label === 'LIVE CALL' && (
                  <span className="ml-auto inline-flex h-2 w-2 rounded-none bg-white shadow-[0_0_10px_white] animate-pulse" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Bottom */}
      <div className="border-t-[2px] border-white/20 p-6">
        <Link
          href="/"
          className="glass-brutal-btn-alt flex items-center justify-center gap-3 w-full py-3 text-xs mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          ROOT ACCESS
        </Link>
        <div className="glass-brutal p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-zinc-500 mb-2">TELEMETRY</p>
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 bg-white rounded-none shadow-[0_0_8px_white] animate-pulse" />
            <span className="text-xs font-bold tracking-widest text-white">ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
