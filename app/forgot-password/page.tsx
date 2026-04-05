import { Icon } from '@iconify/react'
import { resetPassword } from '@/app/login/actions'

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { message?: string; error?: string }
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden main-bg">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[30%] right-[20%] w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] mix-blend-multiply opacity-60"></div>
        <div className="absolute bottom-[30%] left-[20%] w-80 h-80 bg-amber-500/10 rounded-full blur-[100px] mix-blend-multiply opacity-60"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10 glass-bg rounded-[2.5rem]">
        
        <a href="/login" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-slate-600 uppercase tracking-widest mb-8 transition-colors">
          <Icon icon="lucide:arrow-left" className="mr-2 w-4 h-4" />
          Back to login
        </a>

        <div className="text-center mb-8">
          <div className="w-16 h-16 glass-bg rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Icon icon="lucide:key-round" className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Reset Password</h1>
          <p className="text-slate-500 text-sm">Enter your email and we'll send a link</p>
        </div>

        {searchParams?.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
            <Icon icon="lucide:alert-circle" className="w-5 h-5 flex-shrink-0" />
            <p>{searchParams.error}</p>
          </div>
        )}

        {searchParams?.message && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-600 text-sm font-medium">
            <Icon icon="lucide:check-circle-2" className="w-5 h-5 flex-shrink-0" />
            <p>{searchParams.message}</p>
          </div>
        )}

        <form action={resetPassword} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Account Email</label>
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

          <button
            type="submit"
            className="w-full py-4 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
          >
            Send Reset Link
            <Icon icon="lucide:send" className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
