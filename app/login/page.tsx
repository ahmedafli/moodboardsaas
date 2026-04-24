'use client'

import { use } from 'react'
import { Icon } from '@iconify/react'
import { login } from './actions'

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const params = use(searchParams)

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden main-bg">
      {/* Dynamic Background Elements - Matching the Moodboard Theme */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-amber-500/10 rounded-full blur-[120px] mix-blend-multiply opacity-60"></div>
        <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-orange-500/10 rounded-full blur-[120px] mix-blend-multiply opacity-60"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10 glass-bg rounded-[2.5rem]">
        <div className="text-center mb-8">
          <div className="w-16 h-16 glass-bg rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Icon icon="lucide:layout-dashboard" className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Welcome Back</h1>
          <p className="text-slate-500 text-sm">Log in to access your studio</p>
        </div>

        {params?.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
            <Icon icon="lucide:alert-circle" className="w-5 h-5 flex-shrink-0" />
            <p>{params.error}</p>
          </div>
        )}

        <form action={login} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon icon="lucide:mail" className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="email"
                name="email"
                required
                className="w-full glass-input rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Password</label>
              <a href="/forgot-password" className="text-[10px] font-bold text-[#f59e0b] hover:text-orange-600 transition-colors uppercase tracking-widest">
                Forgot password?
              </a>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon icon="lucide:lock" className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                name="password"
                required
                className="w-full glass-input rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-4 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
          >
            Sign In To Studio
            <Icon icon="lucide:arrow-right" className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
