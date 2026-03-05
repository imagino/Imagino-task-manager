'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import {
    listProjects, createProject, updateProject, deleteProject,
    Project, CreateProjectData, UpdateProjectData,
} from '@/lib/projects';

// ─── Modal ────────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
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

const Field = ({ label, value, onChange, required, multiline }: {
    label: string; value: string; onChange: (v: string) => void;
    required?: boolean; multiline?: boolean;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        {multiline ? (
            <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} required={required}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none" />
        ) : (
            <input type="text" value={value} onChange={(e) => onChange(e.target.value)} required={required}
                className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
        )}
    </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectsPage() {
    const [projects, setProjects] = useState<Project[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [modal, setModal] = useState<
        | { type: 'create' }
        | { type: 'view'; project: Project }
        | { type: 'edit'; project: Project }
        | { type: 'delete'; project: Project }
        | null
    >(null);
    const closeModal = () => setModal(null);

    const fetchProjects = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listProjects();
            setProjects(data);
        } catch {
            setError('Failed to load projects.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchProjects(); }, [fetchProjects]);

    // ── Create ────────────────────────────────────────────────────────────────
    const CreateModal = () => {
        const [form, setForm] = useState<CreateProjectData>({ name: '', description: '' });
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault(); setSaving(true); setErr('');
            try {
                await createProject(form);
                await fetchProjects();
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Failed to create project');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="New Project" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
                    <Field label="Project Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                    <Field label="Description (optional)" value={form.description ?? ''} onChange={(v) => setForm({ ...form, description: v })} multiline />
                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Creating…' : 'Create Project'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── View ──────────────────────────────────────────────────────────────────
    const ViewModal = ({ project }: { project: Project }) => (
        <Modal title="Project Details" onClose={closeModal}>
            <dl className="divide-y divide-slate-100 text-sm">
                {([
                    ['ID', project.id],
                    ['Name', project.name],
                    ['Description', project.description || '—'],
                    ['Created By (User ID)', project.created_by],
                    ['Created At', new Date(project.created_at).toLocaleString()],
                ] as [string, string | number][]).map(([k, v]) => (
                    <div key={k} className="py-2.5 flex justify-between gap-4">
                        <dt className="text-slate-500 flex-shrink-0">{k}</dt>
                        <dd className="font-medium text-slate-800 text-right">{v}</dd>
                    </div>
                ))}
            </dl>
        </Modal>
    );

    // ── Edit ──────────────────────────────────────────────────────────────────
    const EditModal = ({ project }: { project: Project }) => {
        const [form, setForm] = useState<UpdateProjectData>({ name: project.name, description: project.description ?? '' });
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault(); setSaving(true); setErr('');
            try {
                await updateProject(project.id, form);
                await fetchProjects();
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Update failed');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="Edit Project" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
                    <Field label="Project Name" value={form.name ?? ''} onChange={(v) => setForm({ ...form, name: v })} />
                    <Field label="Description" value={form.description ?? ''} onChange={(v) => setForm({ ...form, description: v })} multiline />
                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const DeleteModal = ({ project }: { project: Project }) => {
        const [deleting, setDeleting] = useState(false);

        const handleDelete = async () => {
            setDeleting(true);
            try {
                await deleteProject(project.id);
                await fetchProjects();
                closeModal();
            } finally { setDeleting(false); }
        };

        return (
            <Modal title="Delete Project" onClose={closeModal}>
                <p className="text-sm text-slate-600 mb-5">
                    Are you sure you want to permanently delete <strong>{project.name}</strong>? This cannot be undone.
                </p>
                <div className="flex gap-3">
                    <button onClick={closeModal}
                        className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={handleDelete} disabled={deleting}
                        className="flex-1 h-9 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                        {deleting ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </Modal>
        );
    };

    return (
        <DashboardLayout title="Projects">
            {modal?.type === 'create' && <CreateModal />}
            {modal?.type === 'view' && <ViewModal project={modal.project} />}
            {modal?.type === 'edit' && <EditModal project={modal.project} />}
            {modal?.type === 'delete' && <DeleteModal project={modal.project} />}

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Projects</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setModal({ type: 'create' })}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    New Project
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* Project cards grid */}
            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading projects…</div>
            ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
                        <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>
                    <p className="text-sm font-medium text-slate-600">No projects yet</p>
                    <p className="text-xs text-slate-400 mt-1">Click &quot;New Project&quot; to get started</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {projects.map((project) => (
                        <div key={project.id}
                            className="group bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
                            {/* Card header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 flex-shrink-0">
                                    <svg className="h-5 w-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                    </svg>
                                </div>
                                {/* Actions */}
                                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button title="View" onClick={() => setModal({ type: 'view', project })}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button title="Edit" onClick={() => setModal({ type: 'edit', project })}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button title="Delete" onClick={() => setModal({ type: 'delete', project })}
                                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            {/* Card body */}
                            <h3 className="text-sm font-semibold text-slate-800 mb-1 truncate">{project.name}</h3>
                            <p className="text-xs text-slate-500 line-clamp-2 min-h-[2rem]">
                                {project.description || 'No description provided.'}
                            </p>

                            {/* Card footer */}
                            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                                <span className="text-xs text-slate-400">
                                    {new Date(project.created_at).toLocaleDateString()}
                                </span>
                                <Link href={`/dashboard/projects/${project.id}`}
                                    className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    Members
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </DashboardLayout>
    );
}
