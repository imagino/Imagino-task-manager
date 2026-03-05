'use client';

import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

const reports = [
    {
        href: '/dashboard/reports/status',
        title: 'Task Status Report',
        description: 'View the number of tasks in each status (To Do, In Progress, In Review, Done, Cancelled).',
        icon: (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
        ),
        color: 'bg-blue-50 text-blue-600',
        accent: 'hover:border-blue-200 hover:shadow-blue-50',
    },
    {
        href: '/dashboard/reports/overdue',
        title: 'Overdue Task Report',
        description: 'See all tasks that have passed their due date and still need attention.',
        icon: (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        ),
        color: 'bg-red-50 text-red-600',
        accent: 'hover:border-red-200 hover:shadow-red-50',
    },
    {
        href: '/dashboard/reports/priority',
        title: 'Tasks by Priority Report',
        description: 'Understand how tasks are distributed across Urgent, High, Medium, and Low priorities.',
        icon: (
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" />
            </svg>
        ),
        color: 'bg-indigo-50 text-indigo-600',
        accent: 'hover:border-indigo-200 hover:shadow-indigo-50',
    },
];

export default function ReportsIndexPage() {
    return (
        <DashboardLayout title="Reports">
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-800">Reports</h2>
                <p className="text-sm text-slate-500 mt-0.5">Select a report to view detailed insights.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {reports.map(({ href, title, description, icon, color, accent }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`group flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-md ${accent}`}
                    >
                        <div className={`h-12 w-12 flex items-center justify-center rounded-2xl ${color}`}>
                            {icon}
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                {title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500 leading-relaxed">{description}</p>
                        </div>
                        <span className="mt-auto text-xs font-medium text-indigo-600 group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                            View report →
                        </span>
                    </Link>
                ))}
            </div>
        </DashboardLayout>
    );
}
