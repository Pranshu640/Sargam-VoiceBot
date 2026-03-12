'use client';

import { StoreProvider } from '@/lib/store';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <StoreProvider>
      <div className="flex min-h-screen bg-slate-950">
        <Sidebar />
        <main className="ml-64 flex-1 overflow-auto">
          <div className="mx-auto max-w-7xl p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </StoreProvider>
  );
}
