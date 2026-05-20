import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';


const Login = () => {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');

  const { login, googleLogin, microsoftLogin } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();

  // ── Email / Password submit ───────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setSubmitting(true);
    const result = await login(email, password);
    setSubmitting(false);
    if (result.success) navigate('/');
    else setError(result.message);
  };

  // ── OAuth Stubs (integrate real SDK in production) ────────
  const handleGoogleLogin = async () => {
    setError('');
    // TODO: Trigger Google SDK flow here, then pass profile to:
    // const result = await googleLogin({ googleId, email, fullName, profilePhoto });
    setError('Google login requires the Google SDK to be configured. See documentation.');
  };

  const handleMicrosoftLogin = async () => {
    setError('');
    // TODO: Trigger Microsoft MSAL flow here, then pass profile to:
    // const result = await microsoftLogin({ microsoftId, email, fullName });
    setError('Microsoft SSO requires MSAL to be configured. See documentation.');
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center auth-bg px-6 py-12 select-none relative overflow-hidden">

      {/* Floating ambient bubbles */}
      <div className="absolute top-[-10%] left-[-10%] w-[45vw] h-[45vw] rounded-full bg-brand-100/40 blur-[120px] pointer-events-none bubble-drift-1" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-indigo-100/40 blur-[140px] pointer-events-none bubble-drift-2" />
      <div className="absolute top-[35%] left-[15%] w-[30vw] h-[30vw] rounded-full bg-slate-200/50 blur-[100px] pointer-events-none bubble-drift-3" />

      {/* Login Card */}
      <div className="w-full max-w-[440px] bg-white rounded-[28px] p-8 md:p-10 shadow-2xl relative z-10 animate-slide-up">

        {/* Brand Header */}
        <div className="mb-10 text-center flex flex-col items-center">
          {location.state?.role && (
            <div className="mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-50 border border-brand-100 animate-fade-in">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
              <span className="text-[10px] font-bold text-brand-600 uppercase tracking-widest">
                {location.state.role} Portal
              </span>
            </div>
          )}
          <Logo className="h-14 w-auto mb-2" />
          <h1 className="text-[28px] font-black text-slate-900 tracking-tight mt-6">Welcome back</h1>
          <p className="text-[13px] text-slate-500 font-medium">Sign in to your workspace</p>
        </div>



        {/* OAuth Buttons */}
        <div className="space-y-2.5 mb-6">
          <button
            id="btn-google-login"
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 transition-all duration-200 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform"
          >
            {/* Google icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>

          <button
            id="btn-microsoft-login"
            type="button"
            onClick={handleMicrosoftLogin}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 active:bg-slate-100 transition-all duration-200 text-sm font-semibold text-slate-700 shadow-sm hover:shadow-md hover:-translate-y-0.5 transform"
          >
            {/* Microsoft icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#F25022" d="M1 1h10v10H1z"/>
              <path fill="#00A4EF" d="M13 1h10v10H13z"/>
              <path fill="#7FBA00" d="M1 13h10v10H1z"/>
              <path fill="#FFB900" d="M13 13h10v10H13z"/>
            </svg>
            Continue with Microsoft
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">or sign in with email</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 bg-red-50 text-red-600 border border-red-200 rounded-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-shake">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Success redirect message */}
        {location.state?.message && !error && (
          <div className="mb-5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-fade-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {location.state.message}
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email */}
          <div className="w-full flex items-center bg-slate-50 border border-slate-100 focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-100 rounded-2xl px-4 py-3.5 transition-all duration-200">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <input
              id="login-email"
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 font-semibold placeholder-slate-400/70 text-[14px] ml-3"
            />
          </div>

          {/* Password */}
          <div className="w-full flex items-center bg-slate-50 border border-slate-100 focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-brand-100 rounded-2xl px-4 py-3.5 transition-all duration-200">
            <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent outline-none text-slate-800 font-semibold placeholder-slate-400/70 text-[14px] ml-3"
            />
            <button
              type="button"
              id="btn-toggle-password"
              onClick={() => setShowPassword(!showPassword)}
              className="text-slate-400 hover:text-slate-600 focus:outline-none ml-2"
              tabIndex="-1"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>

          {/* Submit */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-2xl text-white font-extrabold text-[15px] bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-700 hover:to-indigo-700 disabled:opacity-60 shadow-brand hover:shadow-brand-hover hover:-translate-y-0.5 transform active:scale-95 transition-all duration-200 mt-1"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-[13px] text-slate-600 font-medium">
            Don&apos;t have an account?{' '}
            <Link 
              to="/register" 
              state={{ role: location.state?.role }} 
              id="link-register" 
              className="text-brand-600 font-bold hover:underline"
            >
              Create account
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
};

export default Login;
