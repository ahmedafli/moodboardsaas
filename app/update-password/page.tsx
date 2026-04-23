import { Icon } from '@iconify/react'
import { updatePassword } from '@/app/login/actions'
import { cookies } from 'next/headers'

export default async function UpdatePasswordPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const cookieStore = await cookies()
  const isInviteFlow = Boolean(cookieStore.get('must_set_password'))

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden main-bg">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[30%] left-[20%] w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] mix-blend-multiply opacity-60"></div>
        <div className="absolute bottom-[30%] right-[20%] w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] mix-blend-multiply opacity-60"></div>
      </div>

      <div className="w-full max-w-md p-8 relative z-10 glass-bg rounded-[2.5rem]">

        <div className="text-center mb-8">
          <div className="w-16 h-16 glass-bg rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Icon icon="lucide:shield-check" className="w-8 h-8 text-[#f59e0b]" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
            {isInviteFlow ? 'Set Password' : 'Reset Password'}
          </h1>
          <p className="text-slate-500 text-sm">
            {isInviteFlow
              ? 'Please choose a secure password for your account'
              : 'Set your new password to regain access'}
          </p>
        </div>

        {searchParams?.error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium">
            <Icon icon="lucide:alert-circle" className="w-5 h-5 flex-shrink-0" />
            <p>{searchParams.error}</p>
          </div>
        )}

        <form action={updatePassword} className="space-y-5">
          {isInviteFlow && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon icon="lucide:user" className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  name="displayName"
                  required
                  className="w-full glass-input rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          {isInviteFlow && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon icon="lucide:phone" className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="tel"
                  name="phone"
                  required
                  className="w-full glass-input rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
                  placeholder="+1 (555) 000-0000"
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">New Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Icon icon="lucide:lock" className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                className="w-full glass-input rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
                placeholder="At least 6 characters"
              />
            </div>
          </div>

          {!isInviteFlow && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirm Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Icon icon="lucide:lock" className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  name="confirmPassword"
                  required
                  minLength={6}
                  className="w-full glass-input rounded-2xl py-3.5 pl-11 pr-4 text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-[#f59e0b]/20 transition-all font-medium"
                  placeholder="Retype your new password"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 px-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-bold shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] mt-6 flex items-center justify-center gap-2"
          >
            {isInviteFlow ? 'Save Profile & Enter Studio' : 'Save New Password'}
            <Icon icon="lucide:arrow-right" className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  )
}
