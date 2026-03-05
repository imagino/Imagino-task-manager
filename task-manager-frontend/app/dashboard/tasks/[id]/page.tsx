'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { getTask, Task } from '@/lib/tasks';
import { listComments, addComment, editComment, deleteComment, TaskComment } from '@/lib/task_comments';
import api from '@/lib/api';

// ─── tiny helpers ─────────────────────────────────────────────────────────────
const statusColors: Record<string, string> = {
    todo: 'bg-slate-100 text-slate-600', in_progress: 'bg-blue-50 text-blue-700',
    in_review: 'bg-amber-50 text-amber-700', done: 'bg-emerald-50 text-emerald-700',
    cancelled: 'bg-red-50 text-red-500',
};
const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-500', medium: 'bg-blue-50 text-blue-600',
    high: 'bg-orange-50 text-orange-600', urgent: 'bg-red-50 text-red-700',
};
const priorityDot: Record<string, string> = {
    low: 'bg-slate-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-600',
};
const fmt = (s: string) => s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
const avatarColor = (name: string | null) => {
    const colors = ['bg-indigo-100 text-indigo-700', 'bg-violet-100 text-violet-700',
        'bg-sky-100 text-sky-700', 'bg-emerald-100 text-emerald-700',
        'bg-rose-100 text-rose-700', 'bg-amber-100 text-amber-700'];
    if (!name) return colors[0];
    return colors[name.charCodeAt(0) % colors.length];
};
const timeAgo = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(iso).toLocaleDateString();
};

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TaskDetailPage() {
    const params = useParams();
    const router = useRouter();
    const taskId = Number(params.id);

    const [task, setTask] = useState<Task | null>(null);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const [currentUserRole, setCurrentUserRole] = useState<string>('user');
    const [error, setError] = useState('');

    // Comment input
    const [newComment, setNewComment] = useState('');
    const [posting, setPosting] = useState(false);
    const [postErr, setPostErr] = useState('');

    // Inline edit state
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editContent, setEditContent] = useState('');
    const [saving, setSaving] = useState(false);

    const bottomRef = useRef<HTMLDivElement>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [t, cs, me] = await Promise.all([
                getTask(taskId),
                listComments(taskId),
                api.get('/api/users/me'),
            ]);
            setTask(t);
            setComments(cs);
            setCurrentUserId(me.id);
            setCurrentUserRole(me.role);
        } catch {
            setError('Failed to load task.');
        } finally { setLoading(false); }
    }, [taskId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Scroll to bottom when comments load
    useEffect(() => {
        if (comments.length > 0) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        }
    }, [comments.length]);

    const handlePost = async () => {
        if (!newComment.trim()) return;
        setPosting(true); setPostErr('');
        try {
            await addComment(taskId, newComment.trim());
            setNewComment('');
            await fetchAll();
        } catch (e: unknown) {
            setPostErr(e instanceof Error ? e.message : 'Failed to post comment');
        } finally { setPosting(false); }
    };

    const handleEdit = async (comment: TaskComment) => {
        if (!editContent.trim()) return;
        setSaving(true);
        try {
            await editComment(taskId, comment.id, editContent.trim());
            setEditingId(null);
            await fetchAll();
        } finally { setSaving(false); }
    };

    const handleDelete = async (commentId: number) => {
        if (!confirm('Delete this comment?')) return;
        await deleteComment(taskId, commentId);
        await fetchAll();
    };

    const canManage = (c: TaskComment) =>
        c.author_id === currentUserId || currentUserRole === 'admin';

    if (loading) return (
        <DashboardLayout title="Task">
            <div className="flex items-center justify-center py-32 text-slate-400 text-sm">Loading…</div>
        </DashboardLayout>
    );

    if (error || !task) return (
        <DashboardLayout title="Task">
            <div className="text-sm text-red-600 py-10 text-center">{error || 'Task not found'}
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout title="Task Detail">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <button onClick={() => router.push('/dashboard/tasks')}
                    className="hover:text-indigo-600 transition-colors">Tasks</button>
                <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-slate-800 truncate max-w-xs">{task.title}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Left: Task details ─────────────────────────────────── */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[task.priority]}`}>
                                <span className={`h-1.5 w-1.5 rounded-full ${priorityDot[task.priority]}`} />
                                {fmt(task.priority)}
                            </span>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[task.status]}`}>
                                {fmt(task.status)}
                            </span>
                        </div>

                        <h2 className="text-base font-semibold text-slate-900 mb-2">{task.title}</h2>
                        {task.description && (
                            <p className="text-sm text-slate-600 mb-4 whitespace-pre-wrap">{task.description}</p>
                        )}

                        {/* Meta */}
                        <dl className="space-y-2.5 text-sm">
                            {[
                                ['Project', task.project_name ?? '—'],
                                ['Assigned to', task.assigned_to_name ?? 'Unassigned'],
                                ['Created by', task.created_by_name ?? '—'],
                                ['Due date', task.due_date
                                    ? new Date(task.due_date + 'T00:00:00').toLocaleDateString()
                                    : '—'],
                                ['Created', new Date(task.created_at).toLocaleDateString()],
                            ].map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2">
                                    <dt className="text-slate-500 flex-shrink-0">{k}</dt>
                                    <dd className="font-medium text-slate-800 text-right">{v}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                </div>

                {/* ── Right: Comments thread ─────────────────────────────── */}
                <div className="lg:col-span-2 flex flex-col gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">

                        {/* Header */}
                        <div className="flex items-center gap-2 px-5 py-4 border-b border-slate-100">
                            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <h3 className="text-sm font-semibold text-slate-700">
                                Comments <span className="text-slate-400 font-normal">({comments.length})</span>
                            </h3>
                        </div>

                        {/* Comment list */}
                        <div className="divide-y divide-slate-50 max-h-[420px] overflow-y-auto">
                            {comments.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <svg className="h-8 w-8 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                    </svg>
                                    <p className="text-xs text-slate-400">No comments yet. Be the first!</p>
                                </div>
                            ) : (
                                comments.map(comment => (
                                    <div key={comment.id} className="px-5 py-4 hover:bg-slate-50/50 group">
                                        <div className="flex items-start gap-3">
                                            {/* Avatar */}
                                            <div className={`h-8 w-8 rounded-full text-xs font-bold flex items-center justify-center flex-shrink-0 ${avatarColor(comment.author_name)}`}>
                                                {initials(comment.author_name)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                {/* Author + time */}
                                                <div className="flex items-baseline gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-slate-800">{comment.author_name ?? 'Unknown'}</span>
                                                    <span className="text-xs text-slate-400">{timeAgo(comment.created_at)}</span>
                                                    {comment.updated_at && comment.updated_at !== comment.created_at && (
                                                        <span className="text-xs text-slate-300 italic">(edited)</span>
                                                    )}
                                                </div>

                                                {/* Content or inline editor */}
                                                {editingId === comment.id ? (
                                                    <div className="space-y-2">
                                                        <textarea
                                                            value={editContent}
                                                            onChange={e => setEditContent(e.target.value)}
                                                            rows={3}
                                                            className="w-full rounded-lg border border-indigo-300 px-3 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-100 resize-none"
                                                            autoFocus
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleEdit(comment)} disabled={saving}
                                                                className="h-7 px-3 rounded-lg bg-indigo-600 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                                                                {saving ? 'Saving…' : 'Save'}
                                                            </button>
                                                            <button onClick={() => setEditingId(null)}
                                                                className="h-7 px-3 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50">
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-700 whitespace-pre-wrap">{comment.content}</p>
                                                )}
                                            </div>

                                            {/* Action buttons — show on hover for own comments */}
                                            {canManage(comment) && editingId !== comment.id && (
                                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                                                    <button onClick={() => { setEditingId(comment.id); setEditContent(comment.content); }}
                                                        className="p-1 rounded text-slate-300 hover:text-amber-600 hover:bg-amber-50"
                                                        title="Edit">
                                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(comment.id)}
                                                        className="p-1 rounded text-slate-300 hover:text-red-600 hover:bg-red-50"
                                                        title="Delete">
                                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                            <div ref={bottomRef} />
                        </div>

                        {/* Compose area */}
                        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/40 rounded-b-xl">
                            {postErr && <p className="text-xs text-red-600 mb-2">{postErr}</p>}
                            <div className="flex gap-3">
                                <textarea
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                            e.preventDefault();
                                            handlePost();
                                        }
                                    }}
                                    placeholder="Add a comment… (Ctrl+Enter to submit)"
                                    rows={2}
                                    className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none placeholder:text-slate-300"
                                />
                                <button
                                    onClick={handlePost}
                                    disabled={posting || !newComment.trim()}
                                    className="flex-shrink-0 h-10 w-10 self-end rounded-xl bg-indigo-600 flex items-center justify-center text-white hover:bg-indigo-700 disabled:opacity-40 transition-colors"
                                    title="Post comment">
                                    {posting ? (
                                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                        </svg>
                                    ) : (
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
