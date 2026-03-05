'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import {
    listTasks, createTask, updateTask, changeStatus, changePriority,
    assignTask, deleteTask,
    Task, CreateTaskData, UpdateTaskData, TaskStatus, TaskPriority,
    TASK_STATUSES, TASK_PRIORITIES, TaskFilters,
} from '@/lib/tasks';
import { listProjects, Project } from '@/lib/projects';
import { listUsers, User } from '@/lib/users';

// ─── Style maps ───────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-600',
    in_progress: 'bg-blue-50 text-blue-700',
    in_review: 'bg-amber-50 text-amber-700',
    done: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-500',
};
const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-500',
    medium: 'bg-blue-50 text-blue-600',
    high: 'bg-orange-50 text-orange-600',
    urgent: 'bg-red-50 text-red-700',
};
const priorityDot: Record<string, string> = {
    low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-600',
};
const formatLabel = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

// ─── Shared UI ────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
                <h2 className="text-base font-semibold text-slate-800">{title}</h2>
                <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
            <div className="px-6 py-5">{children}</div>
        </div>
    </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        {children}
    </div>
);
const inputCls = "h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white";
const textareaCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none";

// ─── Task form (used for create + edit) ──────────────────────────────────────
const TaskForm = ({
    initial, projects, users, onSubmit, saving, err,
}: {
    initial: Partial<CreateTaskData>;
    projects: Project[]; users: User[];
    onSubmit: (d: CreateTaskData) => void;
    saving: boolean; err: string;
}) => {
    const [form, setForm] = useState<CreateTaskData>({
        title: initial.title ?? '',
        description: initial.description ?? '',
        status: initial.status ?? 'todo',
        priority: initial.priority ?? 'medium',
        due_date: initial.due_date ?? null,
        assigned_to: initial.assigned_to ?? null,
        project_id: initial.project_id ?? null,
    });
    const set = (k: keyof CreateTaskData, v: CreateTaskData[typeof k]) => setForm(f => ({ ...f, [k]: v }));

    return (
        <form onSubmit={e => { e.preventDefault(); onSubmit(form); }} className="flex flex-col gap-4">
            {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
            <Field label="Title *">
                <input className={inputCls} value={form.title} required onChange={e => set('title', e.target.value)} />
            </Field>
            <Field label="Description">
                <textarea rows={3} className={textareaCls} value={form.description ?? ''}
                    onChange={e => set('description', e.target.value)} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Status">
                    <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value as TaskStatus)}>
                        {TASK_STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
                    </select>
                </Field>
                <Field label="Priority">
                    <select className={inputCls} value={form.priority} onChange={e => set('priority', e.target.value as TaskPriority)}>
                        {TASK_PRIORITIES.map(p => <option key={p} value={p}>{formatLabel(p)}</option>)}
                    </select>
                </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Due Date">
                    <input type="date" className={inputCls} value={form.due_date ?? ''}
                        onChange={e => set('due_date', e.target.value || null)} />
                </Field>
                <Field label="Assign To">
                    <select className={inputCls} value={form.assigned_to ?? ''}
                        onChange={e => set('assigned_to', e.target.value ? Number(e.target.value) : null)}>
                        <option value="">— unassigned —</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                </Field>
            </div>
            <Field label="Project">
                <select className={inputCls} value={form.project_id ?? ''}
                    onChange={e => set('project_id', e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— no project —</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </Field>
            <button type="submit" disabled={saving}
                className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                {saving ? 'Saving…' : 'Save Task'}
            </button>
        </form>
    );
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filters, setFilters] = useState<TaskFilters>({});

    const [modal, setModal] = useState<
        | { type: 'create' }
        | { type: 'view'; task: Task }
        | { type: 'edit'; task: Task }
        | { type: 'status'; task: Task }
        | { type: 'priority'; task: Task }
        | { type: 'assign'; task: Task }
        | { type: 'delete'; task: Task }
        | null
    >(null);
    const closeModal = () => setModal(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [ts, ps, us] = await Promise.all([
                listTasks(filters), listProjects(), listUsers(),
            ]);
            setTasks(ts); setProjects(ps); setUsers(us);
        } catch {
            setError('Failed to load tasks.');
        } finally { setLoading(false); }
    }, [filters]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ── Create modal ──────────────────────────────────────────────────────────
    const CreateModal = () => {
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');
        const handleSubmit = async (data: CreateTaskData) => {
            setSaving(true); setErr('');
            try { await createTask(data); await fetchAll(); closeModal(); }
            catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); }
            finally { setSaving(false); }
        };
        return (
            <Modal title="Create Task" onClose={closeModal}>
                <TaskForm initial={{}} projects={projects} users={users}
                    onSubmit={handleSubmit} saving={saving} err={err} />
            </Modal>
        );
    };

    // ── View modal ────────────────────────────────────────────────────────────
    const ViewModal = ({ task }: { task: Task }) => (
        <Modal title="Task Details" onClose={closeModal}>
            <div className="space-y-3">
                <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`} />
                        {formatLabel(task.priority)}
                    </span>
                    <span className={`mt-0.5 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
                        {formatLabel(task.status)}
                    </span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                {task.description && <p className="text-sm text-slate-600">{task.description}</p>}
                <dl className="divide-y divide-slate-100 text-sm mt-4">
                    {[
                        ['Project', task.project_name ?? '—'],
                        ['Assigned to', task.assigned_to_name ?? 'Unassigned'],
                        ['Created by', task.created_by_name ?? '—'],
                        ['Due date', task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'],
                        ['Created', new Date(task.created_at).toLocaleString()],
                    ].map(([k, v]) => (
                        <div key={k} className="flex justify-between py-2.5">
                            <dt className="text-slate-500">{k}</dt>
                            <dd className="font-medium text-slate-800">{v}</dd>
                        </div>
                    ))}
                </dl>
            </div>
        </Modal>
    );

    // ── Edit modal ────────────────────────────────────────────────────────────
    const EditModal = ({ task }: { task: Task }) => {
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');
        const handleSubmit = async (data: CreateTaskData) => {
            setSaving(true); setErr('');
            const upd: UpdateTaskData = { title: data.title, description: data.description ?? undefined, due_date: data.due_date, assigned_to: data.assigned_to, project_id: data.project_id };
            try { await updateTask(task.id, upd); await fetchAll(); closeModal(); }
            catch (e: unknown) { setErr(e instanceof Error ? e.message : 'Failed'); }
            finally { setSaving(false); }
        };
        return (
            <Modal title="Edit Task" onClose={closeModal}>
                <TaskForm initial={{ title: task.title, description: task.description ?? '', status: task.status, priority: task.priority, due_date: task.due_date ?? null, assigned_to: task.assigned_to, project_id: task.project_id }}
                    projects={projects} users={users} onSubmit={handleSubmit} saving={saving} err={err} />
            </Modal>
        );
    };

    // ── Change status modal ───────────────────────────────────────────────────
    const StatusModal = ({ task }: { task: Task }) => {
        const [status, setStatus] = useState<TaskStatus>(task.status);
        const [saving, setSaving] = useState(false);
        const handleSave = async () => {
            setSaving(true);
            try { await changeStatus(task.id, status); await fetchAll(); closeModal(); }
            finally { setSaving(false); }
        };
        return (
            <Modal title="Change Status" onClose={closeModal}>
                <p className="text-sm text-slate-500 mb-4 truncate">Task: <strong>{task.title}</strong></p>
                <div className="flex flex-col gap-2 mb-5">
                    {TASK_STATUSES.map(s => (
                        <button key={s} onClick={() => setStatus(s)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${status === s ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                            <span className={`h-2 w-2 rounded-full ${statusColors[s].split(' ')[0].replace('bg-', 'bg-')}`} />
                            {formatLabel(s)}
                        </button>
                    ))}
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="w-full h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? 'Saving…' : 'Set Status'}
                </button>
            </Modal>
        );
    };

    // ── Change priority modal ─────────────────────────────────────────────────
    const PriorityModal = ({ task }: { task: Task }) => {
        const [priority, setPriority] = useState<TaskPriority>(task.priority);
        const [saving, setSaving] = useState(false);
        const handleSave = async () => {
            setSaving(true);
            try { await changePriority(task.id, priority); await fetchAll(); closeModal(); }
            finally { setSaving(false); }
        };
        return (
            <Modal title="Change Priority" onClose={closeModal}>
                <p className="text-sm text-slate-500 mb-4 truncate">Task: <strong>{task.title}</strong></p>
                <div className="flex flex-col gap-2 mb-5">
                    {TASK_PRIORITIES.map(p => (
                        <button key={p} onClick={() => setPriority(p)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${priority === p ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                            <span className={`h-2 w-2 rounded-full ${priorityDot[p]}`} />
                            {formatLabel(p)}
                        </button>
                    ))}
                </div>
                <button onClick={handleSave} disabled={saving}
                    className="w-full h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? 'Saving…' : 'Set Priority'}
                </button>
            </Modal>
        );
    };

    // ── Assign modal ──────────────────────────────────────────────────────────
    const AssignModal = ({ task }: { task: Task }) => {
        const [userId, setUserId] = useState<number | null>(task.assigned_to);
        const [saving, setSaving] = useState(false);
        const handleSave = async () => {
            setSaving(true);
            try { await assignTask(task.id, userId); await fetchAll(); closeModal(); }
            finally { setSaving(false); }
        };
        return (
            <Modal title="Assign Task" onClose={closeModal}>
                <p className="text-sm text-slate-500 mb-4 truncate">Task: <strong>{task.title}</strong></p>
                <select className={`${inputCls} mb-5`} value={userId ?? ''}
                    onChange={e => setUserId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">— unassigned —</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                </select>
                <button onClick={handleSave} disabled={saving}
                    className="w-full h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                    {saving ? 'Saving…' : 'Assign'}
                </button>
            </Modal>
        );
    };

    // ── Delete modal ──────────────────────────────────────────────────────────
    const DeleteModal = ({ task }: { task: Task }) => {
        const [deleting, setDeleting] = useState(false);
        const handleDelete = async () => {
            setDeleting(true);
            try { await deleteTask(task.id); await fetchAll(); closeModal(); }
            finally { setDeleting(false); }
        };
        return (
            <Modal title="Delete Task" onClose={closeModal}>
                <p className="text-sm text-slate-600 mb-5">
                    Permanently delete <strong>{task.title}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={closeModal} className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 h-9 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </Modal>
        );
    };

    // ── Due date helper ───────────────────────────────────────────────────────
    const dueDateClass = (d: string | null) => {
        if (!d) return 'text-slate-400';
        const diff = new Date(d).getTime() - Date.now();
        if (diff < 0) return 'text-red-600 font-medium';
        if (diff < 86400000 * 2) return 'text-orange-600 font-medium';
        return 'text-slate-500';
    };

    return (
        <DashboardLayout title="Tasks">
            {modal?.type === 'create' && <CreateModal />}
            {modal?.type === 'view' && <ViewModal task={modal.task} />}
            {modal?.type === 'edit' && <EditModal task={modal.task} />}
            {modal?.type === 'status' && <StatusModal task={modal.task} />}
            {modal?.type === 'priority' && <PriorityModal task={modal.task} />}
            {modal?.type === 'assign' && <AssignModal task={modal.task} />}
            {modal?.type === 'delete' && <DeleteModal task={modal.task} />}

            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Tasks</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setModal({ type: 'create' })}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Task
                </button>
            </div>

            {/* Filters bar */}
            <div className="flex flex-wrap gap-2 mb-5 p-3 bg-white border border-slate-200 rounded-xl">
                <select className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 bg-white outline-none focus:border-indigo-400"
                    value={filters.project_id ?? ''}
                    onChange={e => setFilters(f => ({ ...f, project_id: e.target.value ? Number(e.target.value) : undefined }))}>
                    <option value="">All Projects</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <select className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 bg-white outline-none focus:border-indigo-400"
                    value={filters.status ?? ''}
                    onChange={e => setFilters(f => ({ ...f, status: (e.target.value as TaskStatus) || undefined }))}>
                    <option value="">All Statuses</option>
                    {TASK_STATUSES.map(s => <option key={s} value={s}>{formatLabel(s)}</option>)}
                </select>
                <select className="h-8 rounded-lg border border-slate-200 px-2 text-xs text-slate-700 bg-white outline-none focus:border-indigo-400"
                    value={filters.priority ?? ''}
                    onChange={e => setFilters(f => ({ ...f, priority: (e.target.value as TaskPriority) || undefined }))}>
                    <option value="">All Priorities</option>
                    {TASK_PRIORITIES.map(p => <option key={p} value={p}>{formatLabel(p)}</option>)}
                </select>
                {(filters.project_id || filters.status || filters.priority) && (
                    <button onClick={() => setFilters({})}
                        className="h-8 px-2 rounded-lg text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 border border-slate-200">
                        × Clear
                    </button>
                )}
            </div>

            {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

            {/* Tasks table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading tasks…</div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
                            <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-600">No tasks found</p>
                        <p className="text-xs text-slate-400 mt-1">Click &quot;New Task&quot; to create one</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    {['Title', 'Status', 'Priority', 'Project', 'Assigned To', 'Due Date', ''].map(h => (
                                        <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tasks.map(task => (
                                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors group">
                                        {/* Title — links to task detail/comments page */}
                                        <td className="px-4 py-3 max-w-[220px]">
                                            <Link href={`/dashboard/tasks/${task.id}`}
                                                className="font-medium text-slate-800 hover:text-indigo-600 truncate block">
                                                {task.title}
                                            </Link>
                                            {task.description && (
                                                <p className="text-xs text-slate-400 truncate">{task.description}</p>
                                            )}
                                        </td>
                                        {/* Status */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
                                                {formatLabel(task.status)}
                                            </span>
                                        </td>
                                        {/* Priority */}
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
                                                <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`} />
                                                {formatLabel(task.priority)}
                                            </span>
                                        </td>
                                        {/* Project */}
                                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                            {task.project_name ?? '—'}
                                        </td>
                                        {/* Assigned to */}
                                        <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">
                                            {task.assigned_to_name ?? <span className="text-slate-300">Unassigned</span>}
                                        </td>
                                        {/* Due date */}
                                        <td className={`px-4 py-3 text-xs whitespace-nowrap ${dueDateClass(task.due_date)}`}>
                                            {task.due_date ? new Date(task.due_date).toLocaleDateString() : '—'}
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button title="View" onClick={() => setModal({ type: 'view', task })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                </button>
                                                <button title="Edit" onClick={() => setModal({ type: 'edit', task })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button title="Change status" onClick={() => setModal({ type: 'status', task })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                                </button>
                                                <button title="Change priority" onClick={() => setModal({ type: 'priority', task })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h9m5-4v12m0 0l-4-4m4 4l4-4" /></svg>
                                                </button>
                                                <button title="Assign" onClick={() => setModal({ type: 'assign', task })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-violet-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                                                </button>
                                                <button title="Delete" onClick={() => setModal({ type: 'delete', task })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
