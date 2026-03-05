'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/Sidebar';

interface DashboardLayoutProps {
    children: React.ReactNode;
    title?: string;
}

export const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
    const router = useRouter();
    // `mounted` ensures we never call localStorage during SSR.
    // Both server and client render null on the first pass, eliminating
    // the hydration mismatch.
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (!isAuthenticated()) {
            router.replace('/login');
        }
    }, [router]);

    // Show nothing until the client has mounted and auth is confirmed.
    if (!mounted || !isAuthenticated()) return null;

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden">
            {/* Sidebar — fixed width */}
            <Sidebar />

            {/* Main content area */}
            <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                {/* Top bar */}
                <header className="flex-shrink-0 h-14 flex items-center px-6 bg-white border-b border-slate-200">
                    <h1 className="text-base font-semibold text-slate-800">
                        {title ?? 'Dashboard'}
                    </h1>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};
