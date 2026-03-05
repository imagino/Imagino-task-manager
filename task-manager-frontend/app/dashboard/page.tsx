'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { listTasks, Task } from '@/lib/tasks';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-50 text-blue-700',
    in_review: 'bg-amber-50 text-amber-700',
    done: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-500',
};
const priorityDot: Record<string, string> = {
    low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-600',
};
const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const isOverdue = (task: Task) =>
    task.due_date &&
    task.status !== 'done' &&
    task.status !== 'cancelled' &&
    new Date(task.due_date + 'T23:59:59') < new Date();

// ─── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
    label: string;
    value: number;
    icon: React.ReactNode;
    color: string;        // tailwind ring + icon bg
    trend?: string;
}

const StatCard = ({ label, value, icon, color, trend }: StatCardProps) => (
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow`}>
        <div className={`flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${color}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
            <p className="text-3xl font-bold text-slate-800 mt-0.5 leading-none">{value}</p>
            {trend && <p className="text-xs text-slate-400 mt-1">{trend}</p>}
        </div>
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function DashboardPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        listTasks().then(setTasks).finally(() => setLoading(false));
    }, []);

    if (!mounted) return null;

    // ── Derived stats ─────────────────────────────────────────────────────────
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status === 'todo' || t.status === 'in_progress' || t.status === 'in_review').length;
    const overdue = tasks.filter(isOverdue).length;
    const cancelled = tasks.filter(t => t.status === 'cancelled').length;

    // Recent 5 tasks (newest first)
    const recent = [...tasks]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5);

    return (
        <DashboardLayout title="Dashboard">

            {/* Welcome bar */}
            <div className="mb-6">
                <h2 className="text-xl font-semibold text-slate-800">Overview</h2>
                <p className="text-sm text-slate-500 mt-0.5">Here&apos;s a summary of all your tasks.</p>
            </div>

            {/* ── Stats cards ─────────────────────────────────────────────── */}
            {loading ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl border border-slate-200 h-28 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <StatCard
                        label="Total Tasks"
                        value={total}
                        trend={`${cancelled} cancelled`}
                        color="bg-indigo-50"
                        icon={
                            <svg className="h-5 w-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Completed"
                        value={completed}
                        trend={total > 0 ? `${Math.round((completed / total) * 100)}% done` : '—'}
                        color="bg-emerald-50"
                        icon={
                            <svg className="h-5 w-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Pending"
                        value={pending}
                        trend="todo + in progress + in review"
                        color="bg-blue-50"
                        icon={
                            <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        }
                    />
                    <StatCard
                        label="Overdue"
                        value={overdue}
                        trend={overdue > 0 ? 'needs attention!' : 'all on track ✓'}
                        color={overdue > 0 ? 'bg-red-50' : 'bg-slate-50'}
                        icon={
                            <svg className={`h-5 w-5 ${overdue > 0 ? 'text-red-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        }
                    />
                </div>
            )}

            {/* ── Donut pie chart ───────────────────────────────────────────── */}
            {!loading && total > 0 && (() => {
                const segments = [
                    { label: 'To Do', count: tasks.filter(t => t.status === 'todo').length, stroke: '#94a3b8' },
                    { label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length, stroke: '#3b82f6' },
                    { label: 'In Review', count: tasks.filter(t => t.status === 'in_review').length, stroke: '#f59e0b' },
                    { label: 'Done', count: completed, stroke: '#10b981' },
                    { label: 'Cancelled', count: cancelled, stroke: '#f87171' },
                ].filter(s => s.count > 0);

                const R = 70;        // outer radius
                const r = 44;        // inner radius (donut hole)
                const cx = 90; const cy = 90;
                const circumference = 2 * Math.PI * R;

                // Build stroked arcs using stroke-dasharray on a circle
                let cumulativePercent = 0;
                const arcs = segments.map(seg => {
                    const pct = seg.count / total;
                    const offset = circumference * (1 - cumulativePercent);
                    const dash = circumference * pct;
                    cumulativePercent += pct;
                    return { ...seg, pct, dash, offset };
                });

                const pct = Math.round((completed / total) * 100);

                return (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
                        <p className="text-sm font-semibold text-slate-700 mb-4">Overall Progress</p>
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            {/* SVG donut */}
                            <div className="flex-shrink-0">
                                <svg width="180" height="180" viewBox="0 0 180 180">
                                    {/* Background ring */}
                                    <circle cx={cx} cy={cy} r={R} fill="none" stroke="#f1f5f9" strokeWidth={R - r} />

                                    {/* Coloured segments */}
                                    {arcs.map((arc, i) => (
                                        <circle
                                            key={i}
                                            cx={cx} cy={cy} r={R}
                                            fill="none"
                                            stroke={arc.stroke}
                                            strokeWidth={R - r}
                                            strokeDasharray={`${arc.dash} ${circumference - arc.dash}`}
                                            strokeDashoffset={arc.offset}
                                            transform={`rotate(-90 ${cx} ${cy})`}
                                            strokeLinecap="butt"
                                            style={{ transition: 'stroke-dasharray 0.7s ease' }}
                                        />
                                    ))}

                                    {/* Centre label */}
                                    <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
                                        className="fill-slate-800" style={{ fontWeight: 700, fontSize: 26 }}>
                                        {pct}%
                                    </text>
                                    <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="middle"
                                        style={{ fill: '#94a3b8', fontSize: 11 }}>
                                        complete
                                    </text>
                                </svg>
                            </div>

                            {/* Legend */}
                            <div className="flex-1 grid grid-cols-1 gap-2 w-full">
                                {[
                                    { label: 'To Do', count: tasks.filter(t => t.status === 'todo').length, color: 'bg-slate-400' },
                                    { label: 'In Progress', count: tasks.filter(t => t.status === 'in_progress').length, color: 'bg-blue-500' },
                                    { label: 'In Review', count: tasks.filter(t => t.status === 'in_review').length, color: 'bg-amber-400' },
                                    { label: 'Done', count: completed, color: 'bg-emerald-500' },
                                    { label: 'Cancelled', count: cancelled, color: 'bg-red-400' },
                                ].map(({ label, count, color }) => (
                                    <div key={label} className="flex items-center gap-2">
                                        <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${color}`} />
                                        <span className="text-xs text-slate-500 flex-1">{label}</span>
                                        <span className="text-xs font-semibold text-slate-700">{count}</span>
                                        <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${color}`}
                                                style={{ width: `${total > 0 ? (count / total) * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                );
            })()}



            {/* ── Recent tasks ─────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700">Recent Tasks</h3>
                    <Link href="/dashboard/tasks"
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        View all →
                    </Link>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-16 text-slate-400 text-sm">Loading…</div>
                ) : recent.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <p className="text-sm font-medium text-slate-500">No tasks yet</p>
                        <Link href="/dashboard/tasks"
                            className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                            Create your first task →
                        </Link>
                    </div>
                ) : (
                    <ul className="divide-y divide-slate-50">
                        {recent.map(task => (
                            <li key={task.id}>
                                <Link href={`/dashboard/tasks/${task.id}`}
                                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group">
                                    {/* Priority dot */}
                                    <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${priorityDot[task.priority]}`} />

                                    {/* Title + project */}
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                                            {task.title}
                                        </p>
                                        {task.project_name && (
                                            <p className="text-xs text-slate-400 truncate">{task.project_name}</p>
                                        )}
                                    </div>

                                    {/* Status badge */}
                                    <span className={`flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
                                        {fmt(task.status)}
                                    </span>

                                    {/* Due date */}
                                    {task.due_date && (
                                        <span className={`flex-shrink-0 text-xs ${isOverdue(task) ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                                            {new Date(task.due_date + 'T00:00:00').toLocaleDateString()}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

        </DashboardLayout>
    );
}
