'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import { getProject, Project } from '@/lib/projects';
import { listUsers, User } from '@/lib/users';
import {
    listMembers, addMember, updateMemberRole, removeMember,
    ProjectMember, MemberRole, ROLES,
} from '@/lib/project_members';

// ─── Helpers ──────────────────────────────────────────────────────────────────
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

const roleBadgeClass: Record<string, string> = {
    admin: 'bg-violet-50 text-violet-700',
    editor: 'bg-amber-50 text-amber-700',
    viewer: 'bg-slate-100 text-slate-600',
};

const RoleBadge = ({ role }: { role: string }) => (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${roleBadgeClass[role] ?? 'bg-slate-100 text-slate-500'}`}>
        {role}
    </span>
);

const initials = (name: string | null) =>
    name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ProjectMembersPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = Number(params.id);

    const [project, setProject] = useState<Project | null>(null);
    const [members, setMembers] = useState<ProjectMember[]>([]);
    const [allUsers, setAllUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const [modal, setModal] = useState<
        | { type: 'add' }
        | { type: 'role'; member: ProjectMember }
        | { type: 'remove'; member: ProjectMember }
        | null
    >(null);
    const closeModal = () => setModal(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [proj, mems, users] = await Promise.all([
                getProject(projectId),
                listMembers(projectId),
                listUsers(),
            ]);
            setProject(proj);
            setMembers(mems);
            setAllUsers(users);
        } catch {
            setError('Failed to load project data.');
        } finally {
            setLoading(false);
        }
    }, [projectId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // Users not yet members (for the add dropdown)
    const memberUserIds = new Set(members.map(m => m.user_id));
    const availableUsers = allUsers.filter(u => !memberUserIds.has(u.id));

    // ── Add member modal ──────────────────────────────────────────────────────
    const AddMemberModal = () => {
        const [userId, setUserId] = useState('');
        const [role, setRole] = useState<MemberRole>('viewer');
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (!userId) { setErr('Please select a user'); return; }
            setSaving(true); setErr('');
            try {
                await addMember(projectId, Number(userId), role);
                await fetchAll();
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Failed to add member');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="Add Member" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-600">Select User</label>
                        <select value={userId} onChange={e => setUserId(e.target.value)}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white">
                            <option value="">— choose a user —</option>
                            {availableUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-600">Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as MemberRole)}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Adding…' : 'Add Member'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── Change role modal ─────────────────────────────────────────────────────
    const ChangeRoleModal = ({ member }: { member: ProjectMember }) => {
        const [role, setRole] = useState<MemberRole>(member.role as MemberRole);
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault(); setSaving(true); setErr('');
            try {
                await updateMemberRole(projectId, member.user_id, role);
                await fetchAll();
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Failed to update role');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="Change Member Role" onClose={closeModal}>
                <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl">
                    <div className="h-9 w-9 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {initials(member.user_name)}
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-800">{member.user_name}</p>
                        <p className="text-xs text-slate-400">{member.user_email}</p>
                    </div>
                </div>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-medium text-slate-600">New Role</label>
                        <select value={role} onChange={e => setRole(e.target.value as MemberRole)}
                            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 bg-white">
                            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Saving…' : 'Save Role'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── Remove member modal ───────────────────────────────────────────────────
    const RemoveModal = ({ member }: { member: ProjectMember }) => {
        const [removing, setRemoving] = useState(false);

        const handleRemove = async () => {
            setRemoving(true);
            try {
                await removeMember(projectId, member.user_id);
                await fetchAll();
                closeModal();
            } finally { setRemoving(false); }
        };

        return (
            <Modal title="Remove Member" onClose={closeModal}>
                <p className="text-sm text-slate-600 mb-5">
                    Remove <strong>{member.user_name}</strong> from this project? They will lose all access.
                </p>
                <div className="flex gap-3">
                    <button onClick={closeModal}
                        className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={handleRemove} disabled={removing}
                        className="flex-1 h-9 rounded-lg bg-red-600 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60">
                        {removing ? 'Removing…' : 'Remove'}
                    </button>
                </div>
            </Modal>
        );
    };

    const title = project ? `${project.name} — Members` : 'Project Members';

    return (
        <DashboardLayout title={title}>
            {modal?.type === 'add' && <AddMemberModal />}
            {modal?.type === 'role' && <ChangeRoleModal member={modal.member} />}
            {modal?.type === 'remove' && <RemoveModal member={modal.member} />}

            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                <button onClick={() => router.push('/dashboard/projects')}
                    className="hover:text-indigo-600 transition-colors">Projects</button>
                <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-slate-800 truncate">{project?.name ?? '…'}</span>
                <svg className="h-4 w-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="font-medium text-slate-800">Members</span>
            </div>

            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">Team Members</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{members.length} member{members.length !== 1 ? 's' : ''}</p>
                </div>
                <button onClick={() => setModal({ type: 'add' })}
                    disabled={availableUsers.length === 0}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 shadow-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Member
                </button>
            </div>

            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            {/* Members table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading…</div>
                ) : members.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 mb-3">
                            <svg className="h-7 w-7 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-600">No members yet</p>
                        <p className="text-xs text-slate-400 mt-1">Click &quot;Add Member&quot; to invite someone</p>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-slate-100 bg-slate-50/60">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Member</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {members.map(member => (
                                <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                {initials(member.user_name)}
                                            </div>
                                            <div>
                                                <p className="font-medium text-slate-800">{member.user_name}</p>
                                                <p className="text-xs text-slate-400">{member.user_email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3"><RoleBadge role={member.role} /></td>
                                    <td className="px-4 py-3 text-xs text-slate-400">
                                        {new Date(member.joined_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            {/* Change role */}
                                            <button title="Change role"
                                                onClick={() => setModal({ type: 'role', member })}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                                </svg>
                                            </button>
                                            {/* Remove */}
                                            <button title="Remove member"
                                                onClick={() => setModal({ type: 'remove', member })}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
                                                </svg>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </DashboardLayout>
    );
}
