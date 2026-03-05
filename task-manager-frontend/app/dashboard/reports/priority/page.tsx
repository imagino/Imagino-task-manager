'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { listTasks, Task } from '@/lib/tasks';

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const priorityColors: Record<string, { bar: string; badge: string; dot: string }> = {
    urgent: { bar: 'bg-red-500', badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
    high: { bar: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
    medium: { bar: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
    low: { bar: 'bg-slate-400', badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};

const HBar = ({ pct, colorCls }: { pct: number; colorCls: string }) => (
    <div className="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
            className={`h-full rounded-full ${colorCls} transition-all duration-700`}
            style={{ width: `${pct}%` }}
        />
    </div>
);

export default function PriorityReportPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        listTasks().then(setTasks).finally(() => setLoading(false));
    }, []);

    if (!mounted) return null;

    const total = tasks.length;
    const priorities = ['urgent', 'high', 'medium', 'low'] as const;
    const priorityRows = priorities.map(p => ({
        priority: p,
        count: tasks.filter(t => t.priority === p).length,
    }));

    return (
        <DashboardLayout title="Tasks by Priority Report">
            {/* Back link */}
            <div className="mb-6">
                <Link
                    href="/dashboard/reports"
                    className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors"
                >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Reports
                </Link>
            </div>

            {/* Header */}
            <div className="mb-6 flex items-center gap-3">
                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Tasks by Priority Report</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {loading ? 'Loading…' : `Based on ${total} total task${total !== 1 ? 's' : ''}`}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 text-slate-400 text-sm animate-pulse">
                    Loading report data…
                </div>
            ) : total === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                    <p className="text-sm font-medium text-slate-600">No data yet</p>
                    <Link href="/dashboard/tasks"
                        className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        Create some tasks first →
                    </Link>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 flex flex-col gap-5">
                        {priorityRows.map(({ priority, count }) => {
                            const pct = total > 0 ? (count / total) * 100 : 0;
                            const c = priorityColors[priority];
                            return (
                                <div key={priority} className="flex items-center gap-3">
                                    <span className={`w-24 flex-shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium justify-center ${c.badge}`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
                                        {fmt(priority)}
                                    </span>
                                    <HBar pct={pct} colorCls={c.bar} />
                                    <span className="w-20 text-right text-sm font-semibold text-slate-700 flex-shrink-0">
                                        {count}
                                        <span className="text-xs text-slate-400 ml-1">({Math.round(pct)}%)</span>
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
