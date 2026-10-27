'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Lock } from 'lucide-react';
import { adminLandingPath } from '@/lib/admin-permissions';

const LOGIN_SUCCESS_KEY = 'aim-admin-login-success';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    setOpening(false);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      try {
        sessionStorage.setItem(LOGIN_SUCCESS_KEY, '1');
      } catch {}

      const data = await res.json().catch(() => ({}));
      const permissions = Array.isArray(data.admin?.permissions) ? data.admin.permissions : [];
      setOpening(true);
      router.replace(data.mustChangePassword ? '/admin/password' : adminLandingPath(permissions));
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-gold-50 via-flame-50/50 to-white px-4">
      {/* Themed back-to-site button. Sits in the top-left corner so it never
          competes with the centred login card. Gold-flame icon, with a soft
          flame underglow on hover that matches the Sign-In button's gradient. */}
      <Link
        href="/"
        aria-label="Back to AIM Archive home"
        className="group absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm transition-all hover:-translate-x-0.5 hover:border-flame-300 hover:bg-white hover:text-flame-700 hover:shadow-[0_8px_22px_rgba(190,140,46,0.18)] sm:left-6 sm:top-6"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5 group-hover:text-flame-600" />
        <span className="hidden sm:inline">Back to Site</span>
        <span className="sm:hidden">Back</span>
      </Link>

      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Image
            src="/api/brand/logo"
            unoptimized
            alt="AIM Archive"
            width={56}
            height={56}
            className="mx-auto rounded-xl"
          />
          <h1 className="font-heading mt-4 text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="mt-1 text-sm text-gray-500">AIM Archive Management</p>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm transition-colors focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                placeholder="Enter Admin Email"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-gray-200 py-3 pl-4 pr-12 text-sm transition-colors focus:border-flame-300 focus:outline-none focus:ring-2 focus:ring-flame-100"
                  placeholder="Enter admin password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  title={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-flame-50 hover:text-flame-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-flame-200"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.22)] transition-all hover:from-gold-600 hover:to-flame-600 disabled:opacity-50"
          >
            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Lock className="h-4 w-4" />}
            {opening ? 'Opening admin…' : loading ? 'Checking credentials…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
