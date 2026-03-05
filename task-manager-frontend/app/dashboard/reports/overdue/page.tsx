'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { listTasks, Task } from '@/lib/tasks';

const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const isOverdue = (t: Task) =>
    !!t.due_date &&
    t.status !== 'done' &&
    t.status !== 'cancelled' &&
    new Date(t.due_date + 'T23:59:59') < new Date();

const priorityColors: Record<string, { badge: string; dot: string }> = {
    urgent: { badge: 'bg-red-50 text-red-700', dot: 'bg-red-500' },
    high: { badge: 'bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
    medium: { badge: 'bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
    low: { badge: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400' },
};
const statusColors: Record<string, { badge: string }> = {
    todo: { badge: 'bg-slate-100 text-slate-600' },
    in_progress: { badge: 'bg-blue-50 text-blue-700' },
    in_review: { badge: 'bg-amber-50 text-amber-700' },
    done: { badge: 'bg-emerald-50 text-emerald-700' },
    cancelled: { badge: 'bg-red-50 text-red-500' },
};

export default function OverdueReportPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        listTasks().then(setTasks).finally(() => setLoading(false));
    }, []);

    if (!mounted) return null;

    const overdueTasks = tasks
        .filter(isOverdue)
        .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime());

    return (
        <DashboardLayout title="Overdue Task Report">
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
                <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Overdue Task Report</h2>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {loading
                            ? 'Loading…'
                            : overdueTasks.length > 0
                                ? `${overdueTasks.length} task${overdueTasks.length !== 1 ? 's' : ''} past due date`
                                : 'All tasks are on track ✓'}
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-32 text-slate-400 text-sm animate-pulse">
                    Loading report data…
                </div>
            ) : overdueTasks.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 flex items-center gap-3 text-emerald-600">
                    <svg className="h-6 w-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm font-medium">No overdue tasks — great work!</p>
                </div>
            ) : (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    {['Task', 'Priority', 'Status', 'Due Date', 'Days Overdue', ''].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {overdueTasks.map(task => {
                                    const daysOver = Math.floor(
                                        (Date.now() - new Date(task.due_date! + 'T23:59:59').getTime()) / 86400000
                                    );
                                    const pc = priorityColors[task.priority];
                                    const sc = statusColors[task.status];
                                    return (
                                        <tr key={task.id} className="hover:bg-red-50/30 transition-colors">
                                            <td className="px-4 py-3">
                                                <Link href={`/dashboard/tasks/${task.id}`}
                                                    className="font-medium text-slate-800 hover:text-indigo-600 max-w-[200px] truncate block">
                                                    {task.title}
                                                </Link>
                                                {task.project_name && (
                                                    <span className="text-xs text-slate-400">{task.project_name}</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${pc.badge}`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${pc.dot}`} />
                                                    {fmt(task.priority)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sc.badge}`}>
                                                    {fmt(task.status)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-red-600 font-medium whitespace-nowrap">
                                                {new Date(task.due_date! + 'T00:00:00').toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap">
                                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5">
                                                    +{daysOver}d
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/dashboard/tasks/${task.id}`}
                                                    className="text-xs text-indigo-600 hover:text-indigo-700 font-medium whitespace-nowrap">
                                                    View →
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </DashboardLayout>
    );
}
