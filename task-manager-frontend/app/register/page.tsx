import React from 'react';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
    return (
        <div className="min-h-screen relative flex items-center justify-center bg-slate-50 overflow-hidden px-4 py-12 sm:px-6 lg:px-8">
            {/* Decorative background elements */}
            <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob"></div>
            <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-2000"></div>
            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-2xl opacity-70 animate-blob animation-delay-4000"></div>

            <div className="relative w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 border border-white/50 overflow-hidden my-8">
                <div className="px-8 py-10 sm:px-12 sm:py-12">
                    <div className="mb-8 text-center">
                        {/* Logo placeholder */}
                        <div className="mx-auto h-12 w-12 bg-indigo-600 rounded-xl flex items-center justify-center transform rotate-3 shadow-lg mb-6">
                            <svg className="w-8 h-8 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                            Create an account
                        </h2>
                        <p className="mt-2 text-sm text-slate-600">
                            Start managing your tasks efficiently today
                        </p>
                    </div>

                    <RegisterForm />
                </div>
            </div>
        </div>
    );
}
