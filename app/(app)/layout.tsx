'use client';

import ConvexClientProvider from '@/components/ConvexClientProvider';
import { StoreProvider } from '@/lib/store';
import Sidebar from '@/components/Sidebar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ConvexClientProvider>
      <StoreProvider>
        <div className="flex min-h-screen bg-black text-white relative">
          <Sidebar />
          <main className="ml-64 flex-1 overflow-auto relative z-10 p-6 lg:p-12 min-h-screen">
            <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none z-0 fixed" />
            <div className="mx-auto max-w-[1400px] relative z-10">
              {children}
            </div>
          </main>
        </div>
      </StoreProvider>
    </ConvexClientProvider>
  );
}
