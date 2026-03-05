'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { setToken } from '@/lib/auth';
import api from '@/lib/api';

export const LoginForm = () => {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Adjust the endpoint to match the actual FastAPI/Node backend architecture
            const response = await api.post('/api/auth/login', { email, password });

            if (response && response.access_token) {
                setToken(response.access_token);
                router.push('/dashboard'); // or redirect to tasks based on requirements
            } else {
                setError('Login failed. No token received.');
            }
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
                    {error}
                </div>
            )}

            <Input
                label="Email Address"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />

            <div className="flex flex-col gap-1.5">
                <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <div className="flex justify-end mt-1">
                    <Link href="/forgot-password" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                        Forgot password?
                    </Link>
                </div>
            </div>

            <Button type="submit" className="w-full mt-2" isLoading={isLoading} size="lg">
                Sign in
            </Button>

            <div className="text-center mt-2 text-sm text-slate-600">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Sign up
                </Link>
            </div>
        </form>
    );
};
