'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
  LayoutDashboard,
  BookCopy,
  FileText,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/magazines', icon: BookCopy, label: 'Magazines' },
  { href: '/admin/issues', icon: FileText, label: 'Issues' },
];

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    // Check auth on mount
    fetch('/api/admin/auth/check')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => setAdmin(data.admin))
      .catch(() => router.push('/admin/login'));
  }, [router]);

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  if (!admin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-200 border-t-gold-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden w-64 flex-col border-r border-gray-200 bg-white lg:flex">
        <div className="flex items-center gap-3 border-b border-gray-100 px-6 py-5">
          <Image src="/logo.png" alt="AIM" width={32} height={32} className="rounded-lg" />
          <div>
            <p className="font-heading text-sm font-bold text-gray-900">AIM Archive</p>
            <p className="text-[11px] text-gray-400">Admin Panel</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gold-50 text-gold-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-gray-100 p-4">
          <div className="mb-3 px-2">
            <p className="text-sm font-medium text-gray-900">{admin.name}</p>
            <p className="text-xs text-gray-400">{admin.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-2 text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-heading text-sm font-bold text-gray-900">Admin</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="relative w-64 bg-white shadow-xl">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="border-b border-gray-100 px-6 py-5">
                <p className="font-heading text-sm font-bold">AIM Archive</p>
              </div>
              <nav className="px-3 py-4">
                {navItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
                        active ? 'bg-gold-50 text-gold-700' : 'text-gray-600'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
