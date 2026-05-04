'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  BookCopy,
  FileText,
  LogOut,
  Menu,
  Settings,
  X,
  ExternalLink,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { UIProvider } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/magazines', icon: BookCopy, label: 'Magazines' },
  { href: '/admin/issues', icon: FileText, label: 'Issues' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
];

const COLLAPSED_WIDTH = 64;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = 'aim-admin-sidebar';

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);

  // Collapse + resize state (desktop only)
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [hydrated, setHydrated] = useState(false);
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { collapsed?: unknown; width?: unknown };
        if (typeof parsed.collapsed === 'boolean') setCollapsed(parsed.collapsed);
        if (typeof parsed.width === 'number') {
          setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, parsed.width)));
        }
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ collapsed, width }));
    } catch {}
  }, [collapsed, width, hydrated]);

  // Drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX));
      setWidth(next);
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    if (collapsed) return;
    e.preventDefault();
    draggingRef.current = true;
    setDragging(true);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-flame-100 border-t-flame-500" />
      </div>
    );
  }

  const effectiveWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <UIProvider>
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <motion.aside
        animate={{ width: effectiveWidth }}
        transition={dragging ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: effectiveWidth }}
        className="relative hidden shrink-0 flex-col border-r border-gray-200 bg-white lg:flex"
      >
        {/* Header */}
        <div
          className={cn(
            'flex border-b border-gray-100',
            collapsed ? 'flex-col items-center gap-2 px-2 py-4' : 'items-center gap-3 px-6 py-5',
          )}
        >
          <Image src="/logo.png" alt="AIM" width={32} height={32} className="shrink-0 rounded-lg" />
          {!collapsed && (
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="font-heading truncate text-sm font-bold text-gray-900">AIM Archive</p>
              <p className="truncate text-[11px] text-gray-400">Admin Panel</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-flame-300 text-flame-500 transition-colors hover:border-flame-500 hover:bg-flame-50 hover:text-flame-700"
          >
            {collapsed ? (
              <ChevronsRight className="h-5 w-5" strokeWidth={2.5} />
            ) : (
              <ChevronsLeft className="h-5 w-5" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Nav */}
        <nav className={cn('flex flex-1 flex-col py-4', collapsed ? 'px-2' : 'px-3')}>
          {navItems.map((item) => {
            const active =
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  'mb-1 flex items-center rounded-xl text-sm font-medium transition-colors',
                  collapsed ? 'h-10 justify-center px-2' : 'gap-3 px-4 py-2.5',
                  active
                    ? 'bg-gradient-to-r from-gold-50 to-flame-50 text-flame-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}

          <div className={cn('mt-auto border-t border-gray-100', collapsed ? 'pt-2' : 'pt-3')}>
            <Link
              href="/"
              target="_blank"
              rel="noopener"
              title={collapsed ? 'View Site' : undefined}
              className={cn(
                'flex items-center rounded-xl text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900',
                collapsed ? 'h-10 justify-center px-2' : 'gap-3 px-4 py-2.5',
              )}
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">View Site</span>}
            </Link>
          </div>
        </nav>

        {/* User info + sign out */}
        <div className={cn('border-t border-gray-100', collapsed ? 'p-2' : 'p-4')}>
          {!collapsed && (
            <div className="mb-3 px-2">
              <p className="truncate text-sm font-medium text-gray-900">{admin.name}</p>
              <p className="truncate text-xs text-gray-400">{admin.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            title={collapsed ? `Sign Out (${admin.email})` : undefined}
            className={cn(
              'flex w-full items-center rounded-xl text-sm text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600',
              collapsed ? 'h-10 justify-center px-2' : 'gap-2 px-4 py-2',
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        {/* Resize handle on right edge — disabled when collapsed */}
        {!collapsed && (
          <div
            onMouseDown={startDrag}
            className={cn(
              'absolute top-0 right-0 z-10 h-full w-1 cursor-col-resize transition-colors',
              dragging ? 'bg-flame-400' : 'hover:bg-flame-300',
            )}
            aria-label="Resize sidebar"
            role="separator"
          />
        )}
      </motion.aside>

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
                        active ? 'bg-gradient-to-r from-gold-50 to-flame-50 text-flame-700' : 'text-gray-600'
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
                <Link
                  href="/"
                  target="_blank"
                  rel="noopener"
                  onClick={() => setSidebarOpen(false)}
                  className="mt-2 flex items-center gap-3 rounded-xl border-t border-gray-100 px-4 pt-4 pb-2.5 text-sm font-medium text-gray-600"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Site
                </Link>
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
    </UIProvider>
  );
}
