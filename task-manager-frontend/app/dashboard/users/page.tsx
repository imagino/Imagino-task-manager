'use client';

import { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';
import {
    listUsers, registerUser, updateMyProfile, changeMyPassword,
    deactivateUser, activateUser,
    User, RegisterUserData, UpdateProfileData, ChangePasswordData,
} from '@/lib/users';

// ─── Modal wrapper ────────────────────────────────────────────────────────────
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

// ─── Small reusable form field ────────────────────────────────────────────────
const Field = ({ label, type = 'text', value, onChange, required }: {
    label: string; type?: string; value: string;
    onChange: (v: string) => void; required?: boolean;
}) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-slate-600">{label}</label>
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            className="h-9 w-full rounded-lg border border-slate-200 px-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        />
    </div>
);

// ─── Badge ────────────────────────────────────────────────────────────────────
const Badge = ({ active }: { active: boolean }) => (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
        }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-red-400'}`} />
        {active ? 'Active' : 'Inactive'}
    </span>
);

// ─── Main page ────────────────────────────────────────────────────────────────
export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Modal state
    const [modal, setModal] = useState<
        | { type: 'register' }
        | { type: 'view'; user: User }
        | { type: 'edit'; user: User }
        | { type: 'password'; user: User }
        | { type: 'deactivate'; user: User }
        | null
    >(null);

    const closeModal = () => setModal(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listUsers();
            setUsers(data);
        } catch {
            setError('Failed to load users. Admin access required.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // ── Register ──────────────────────────────────────────────────────────────
    const RegisterModal = () => {
        const [form, setForm] = useState<RegisterUserData>({ name: '', email: '', password: '' });
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setSaving(true); setErr('');
            try {
                await registerUser(form);
                await fetchUsers();
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Failed to register user');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="Register New User" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
                    <Field label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                    <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                    <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} required />
                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Registering…' : 'Register User'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── View profile ──────────────────────────────────────────────────────────
    const ViewModal = ({ user }: { user: User }) => (
        <Modal title="User Profile" onClose={closeModal}>
            <dl className="divide-y divide-slate-100 text-sm">
                {([['ID', user.id], ['Name', user.name], ['Email', user.email],
                ['Role', user.role], ['Status', user.is_active ? 'Active' : 'Inactive'],
                ['Joined', new Date(user.created_at).toLocaleDateString()]] as [string, string | number][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between py-2.5">
                        <dt className="text-slate-500">{k}</dt>
                        <dd className="font-medium text-slate-800">{v}</dd>
                    </div>
                ))}
            </dl>
        </Modal>
    );

    // ── Edit profile ──────────────────────────────────────────────────────────
    const EditModal = ({ user }: { user: User }) => {
        const [form, setForm] = useState<UpdateProfileData>({ name: user.name, email: user.email });
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setSaving(true); setErr('');
            try {
                await updateMyProfile(form);
                await fetchUsers();
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Update failed');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="Update Profile" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
                    <Field label="Full Name" value={form.name ?? ''} onChange={(v) => setForm({ ...form, name: v })} />
                    <Field label="Email" type="email" value={form.email ?? ''} onChange={(v) => setForm({ ...form, email: v })} />
                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── Change password ───────────────────────────────────────────────────────
    const PasswordModal = () => {
        const [form, setForm] = useState<ChangePasswordData>({ current_password: '', new_password: '' });
        const [confirm, setConfirm] = useState('');
        const [saving, setSaving] = useState(false);
        const [err, setErr] = useState('');

        const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            if (form.new_password !== confirm) { setErr('New passwords do not match'); return; }
            setSaving(true); setErr('');
            try {
                await changeMyPassword(form);
                closeModal();
            } catch (e: unknown) {
                setErr(e instanceof Error ? e.message : 'Failed to change password');
            } finally { setSaving(false); }
        };

        return (
            <Modal title="Change Password" onClose={closeModal}>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg p-2">{err}</p>}
                    <Field label="Current Password" type="password" value={form.current_password}
                        onChange={(v) => setForm({ ...form, current_password: v })} required />
                    <Field label="New Password" type="password" value={form.new_password}
                        onChange={(v) => setForm({ ...form, new_password: v })} required />
                    <Field label="Confirm New Password" type="password" value={confirm}
                        onChange={setConfirm} required />
                    <button type="submit" disabled={saving}
                        className="mt-1 h-9 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60">
                        {saving ? 'Changing…' : 'Change Password'}
                    </button>
                </form>
            </Modal>
        );
    };

    // ── Deactivate confirm ────────────────────────────────────────────────────
    const DeactivateModal = ({ user }: { user: User }) => {
        const [saving, setSaving] = useState(false);

        const handleConfirm = async () => {
            setSaving(true);
            try {
                if (user.is_active) {
                    await deactivateUser(user.id);
                } else {
                    await activateUser(user.id);
                }
                await fetchUsers();
                closeModal();
            } finally { setSaving(false); }
        };

        const action = user.is_active ? 'Deactivate' : 'Re-activate';
        const color = user.is_active ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700';

        return (
            <Modal title={`${action} User`} onClose={closeModal}>
                <p className="text-sm text-slate-600 mb-5">
                    Are you sure you want to <strong>{action.toLowerCase()}</strong>{' '}
                    <strong>{user.name}</strong>?
                    {user.is_active && ' They will not be able to log in until reactivated.'}
                </p>
                <div className="flex gap-3">
                    <button onClick={closeModal}
                        className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} disabled={saving}
                        className={`flex-1 h-9 rounded-lg text-sm font-medium text-white disabled:opacity-60 ${color}`}>
                        {saving ? 'Processing…' : action}
                    </button>
                </div>
            </Modal>
        );
    };

    return (
        <DashboardLayout title="Users">
            {/* Active modal */}
            {modal?.type === 'register' && <RegisterModal />}
            {modal?.type === 'view' && <ViewModal user={modal.user} />}
            {modal?.type === 'edit' && <EditModal user={modal.user} />}
            {modal?.type === 'password' && <PasswordModal />}
            {modal?.type === 'deactivate' && <DeactivateModal user={modal.user} />}

            {/* Page header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-lg font-semibold text-slate-800">All Users</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
                </div>
                <button onClick={() => setModal({ type: 'register' })}
                    className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 shadow-sm">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Register User
                </button>
            </div>

            {/* Error */}
            {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">Loading users…</div>
                ) : users.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">No users found.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/60">
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Email</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Role</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Joined</th>
                                    <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-4 py-3 text-slate-400 font-mono text-xs">{user.id}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-7 w-7 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                                                    {user.name?.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) ?? '?'}
                                                </div>
                                                <span className="font-medium text-slate-800">{user.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{user.email}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${user.role === 'admin'
                                                    ? 'bg-violet-50 text-violet-700'
                                                    : 'bg-slate-100 text-slate-600'
                                                }`}>{user.role}</span>
                                        </td>
                                        <td className="px-4 py-3"><Badge active={user.is_active} /></td>
                                        <td className="px-4 py-3 text-slate-400 text-xs">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* View */}
                                                <button title="View profile"
                                                    onClick={() => setModal({ type: 'view', user })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                    </svg>
                                                </button>
                                                {/* Edit */}
                                                <button title="Edit profile"
                                                    onClick={() => setModal({ type: 'edit', user })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                {/* Change password */}
                                                <button title="Change password"
                                                    onClick={() => setModal({ type: 'password', user })}
                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50">
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                                                    </svg>
                                                </button>
                                                {/* Deactivate / Activate */}
                                                <button title={user.is_active ? 'Deactivate' : 'Activate'}
                                                    onClick={() => setModal({ type: 'deactivate', user })}
                                                    className={`p-1.5 rounded-lg ${user.is_active
                                                            ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                                            : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                                                        }`}>
                                                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        {user.is_active ? (
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                                        ) : (
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        )}
                                                    </svg>
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
