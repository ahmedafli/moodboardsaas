"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage(null);
        setLoading(true);

        try {
            const res = await fetch("/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (data.message === "User verified successfully") {
                setMessage({ text: "Login successful! Redirecting…", type: "success" });
                // Set session cookie (7 days)
                document.cookie = `session=authenticated; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
                setTimeout(() => router.push("/home"), 1500);
            } else {
                setMessage({ text: data.message || "Invalid username or password", type: "error" });
            }
        } catch {
            setMessage({ text: "Something went wrong. Please try again.", type: "error" });
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen main-bg text-slate-800 flex items-center justify-center p-6">
            {/* Login Card */}
            <div className="max-w-md w-full glass-bg rounded-[2.5rem] p-10 flex flex-col items-center gap-8 shadow-2xl relative overflow-hidden">
                {/* Decorative Background Shapes */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/5 rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/5 rounded-full blur-3xl" />

                {/* Top Icon */}
                <div className="relative">
                    <div className="w-24 h-24 bg-white/40 backdrop-blur-2xl rounded-[2rem] flex items-center justify-center border border-white/60 shadow-inner group">
                        <Icon
                            icon="lucide:shield-check"
                            className="text-5xl text-[#f59e0b] group-hover:scale-110 transition-transform duration-500"
                        />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-[#f59e0b] rounded-full flex items-center justify-center text-white shadow-lg border-4 border-white">
                        <Icon icon="lucide:lock" className="text-xs" />
                    </div>
                </div>

                {/* Headings */}
                <div className="text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
                        Welcome Back
                    </h1>
                    <p className="text-slate-500 font-medium">
                        Enter your credentials to access your account
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
                    {/* Email Field */}
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icon icon="lucide:mail" />
                            </div>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="w-full glass-input rounded-2xl py-4 pl-12 pr-4 outline-none text-slate-900 font-medium placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Password Field */}
                    <div className="flex flex-col gap-2">
                        <div className="flex justify-between items-center px-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                Password
                            </label>
                            <a
                                href="#"
                                id="forgot-password-link"
                                className="text-xs font-bold text-[#f59e0b] hover:underline uppercase tracking-wider"
                            >
                                Forgot password?
                            </a>
                        </div>
                        <div className="relative">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icon icon="lucide:lock" />
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter your password"
                                className="w-full glass-input rounded-2xl py-4 pl-12 pr-4 outline-none text-slate-900 font-medium placeholder:text-slate-300"
                            />
                        </div>
                    </div>

                    {/* Feedback Message */}
                    {message && (
                        <div
                            className={`w-full text-center text-sm font-semibold px-4 py-3 rounded-2xl transition-all ${message.type === "success"
                                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                : "bg-red-50 text-red-500 border border-red-200"
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        id="btn-login-submit"
                        disabled={loading}
                        className="w-full py-4 mt-2 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 group cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {loading ? (
                            <>
                                <Icon icon="lucide:loader-2" className="animate-spin text-lg" />
                                <span>Verifying…</span>
                            </>
                        ) : (
                            <>
                                <span>Login to Dashboard</span>
                                <Icon
                                    icon="lucide:arrow-right"
                                    className="group-hover:translate-x-1 transition-transform"
                                />
                            </>
                        )}
                    </button>
                </form>

                {/* Sign Up Link */}
                <div className="text-center">
                    <span className="text-sm text-slate-400 font-medium">
                        Don&apos;t have an account?
                    </span>
                    <Link
                        href="#"
                        id="signup-link"
                        className="text-sm font-bold text-slate-900 hover:text-[#f59e0b] transition-colors ml-1"
                    >
                        Request Access
                    </Link>
                </div>
            </div>
        </div>
    );
}
