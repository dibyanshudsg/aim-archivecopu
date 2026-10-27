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
  SearchCheck,
  HardDrive,
  LogOut,
  Menu,
  Settings,
  UsersRound,
  ShieldCheck,
  ScrollText,
  Navigation,
  X,
  ExternalLink,
  ChevronsLeft,
  ChevronsRight,
  LoaderCircle,
} from 'lucide-react';
import { UIProvider, useUI } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard', permission: 'dashboard.view' },
  { href: '/admin/magazines', icon: BookCopy, label: 'Magazines', permission: 'catalogue.view' },
  { href: '/admin/issues', icon: FileText, label: 'Issues', permission: 'catalogue.view' },
  { href: '/admin/indexing', icon: SearchCheck, label: 'Search Indexing', permission: 'indexing.view' },
  { href: '/admin/navigation', icon: Navigation, label: 'Navigation', permission: 'navigation.view' },
  { href: '/admin/storage', icon: HardDrive, label: 'Storage', permission: 'storage.view' },
  { href: '/admin/settings', icon: Settings, label: 'Settings', permission: 'settings.view' },
  { href: '/admin/users', icon: UsersRound, label: 'Admin Users', permission: 'users.manage' },
  { href: '/admin/roles', icon: ShieldCheck, label: 'Roles & Permissions', permission: 'roles.manage' },
  { href: '/admin/activity', icon: ScrollText, label: 'Activity Log', permission: 'audit.view' },
];

const COLLAPSED_WIDTH = 64;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;
const DEFAULT_WIDTH = 256;
const STORAGE_KEY = 'aim-admin-sidebar';
const LOGIN_SUCCESS_KEY = 'aim-admin-login-success';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  permissions: string[];
}

export function AdminDashboardShell({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin: AdminUser;
}) {
  return (
    <UIProvider>
      <AdminDashboardFrame admin={admin}>{children}</AdminDashboardFrame>
    </UIProvider>
  );
}

function AdminDashboardFrame({
  children,
  admin,
}: {
  children: React.ReactNode;
  admin: AdminUser;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useUI();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [avatarVersion, setAvatarVersion] = useState(0);

  useEffect(() => {
    const refresh = () => setAvatarVersion(Date.now());
    window.addEventListener('admin-avatar-changed', refresh);
    return () => window.removeEventListener('admin-avatar-changed', refresh);
  }, []);

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

  function prefetchAdminRoute(href: string) {
    router.prefetch(href);
  }

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  function beginNavigation(href: string) {
    if (href !== pathname) setPendingHref(href);
  }

  useEffect(() => {
    try {
      if (sessionStorage.getItem(LOGIN_SUCCESS_KEY) !== '1') return;
      sessionStorage.removeItem(LOGIN_SUCCESS_KEY);
      toast.success('Welcome back to the archive.', {
        title: 'Signed in successfully',
        position: 'top-center',
        variant: 'admin',
        durationMs: 2600,
      });
    } catch {}
  }, [toast]);

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  const effectiveWidth = collapsed ? COLLAPSED_WIDTH : width;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <motion.aside
        animate={{ width: effectiveWidth }}
        transition={dragging ? { duration: 0 } : { type: 'tween', duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        style={{ width: effectiveWidth }}
        className="sticky top-0 hidden h-screen shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white lg:flex"
      >
        {/* Header */}
        <div
          className={cn(
            'flex shrink-0 border-b border-gray-100',
            collapsed ? 'flex-col items-center gap-2 px-2 py-4' : 'items-center gap-3 px-6 py-5',
          )}
        >
          <Image src="/api/brand/logo" unoptimized alt="AIM" width={32} height={32} className="shrink-0 rounded-lg" />
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
        <nav className={cn('flex min-h-0 flex-1 flex-col overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
          {navItems.filter(item => !item.permission || admin.permissions.includes(item.permission)).map((item) => {
            const active =
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const pending = pendingHref === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onMouseEnter={() => prefetchAdminRoute(item.href)}
                onFocus={() => prefetchAdminRoute(item.href)}
                onClick={() => beginNavigation(item.href)}
                title={collapsed ? item.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'mb-1 flex items-center rounded-xl text-sm font-medium transition-colors',
                  collapsed ? 'h-10 justify-center px-2' : 'gap-3 px-4 py-2.5',
                  active || pending
                    ? 'bg-gradient-to-r from-gold-50 to-flame-50 text-flame-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                {pending ? <LoaderCircle className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" /> : <item.icon className="h-4 w-4 shrink-0" />}
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
        <div className={cn('shrink-0 border-t border-gray-100 bg-white', collapsed ? 'p-2' : 'p-4')}>
          <Link href="/admin/account" onClick={() => beginNavigation('/admin/account')} title={collapsed ? 'Your profile' : undefined} aria-label={collapsed ? 'Your profile' : undefined} className={cn('mb-2 flex items-center rounded-xl transition-colors hover:bg-flame-50 focus-visible:outline-2 focus-visible:outline-flame-600', collapsed ? 'justify-center p-1' : 'gap-3 p-2')}>
            <Image src={`/api/admin/avatar?v=${avatarVersion}`} unoptimized alt="" width={36} height={36} className="h-9 w-9 shrink-0 rounded-full bg-flame-50 object-cover" />
            {!collapsed && <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-gray-900">{admin.name}</span><span className="block truncate text-xs text-gray-500">{admin.email}</span></span>}
          </Link>
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
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 lg:hidden">
          <div className="flex items-center gap-2">
            <button onClick={() => setSidebarOpen(true)} className="p-1 text-gray-600">
              <Menu className="h-5 w-5" />
            </button>
            <span className="font-heading text-sm font-bold text-gray-900">Admin</span>
          </div>
          <Link href="/admin/account" aria-label="Your profile" className="rounded-full focus-visible:outline-2 focus-visible:outline-flame-600"><Image src={`/api/admin/avatar?v=${avatarVersion}`} unoptimized alt="" width={36} height={36} className="h-9 w-9 rounded-full bg-flame-50 object-cover" /></Link>
        </header>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div className="fixed inset-0 bg-black/30" onClick={() => setSidebarOpen(false)} />
            <div className="relative flex h-dvh w-64 flex-col bg-white shadow-xl">
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-4 right-4 text-gray-400"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="border-b border-gray-100 px-6 py-5">
                <p className="font-heading text-sm font-bold">AIM Archive</p>
              </div>
              <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
                {navItems.filter(item => !item.permission || admin.permissions.includes(item.permission)).map((item) => {
                  const active = pathname === item.href;
                  const pending = pendingHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onMouseEnter={() => prefetchAdminRoute(item.href)}
                      onFocus={() => prefetchAdminRoute(item.href)}
                      onClick={() => { beginNavigation(item.href); setSidebarOpen(false); }}
                      aria-current={active ? 'page' : undefined}
                      className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium ${
                        active || pending ? 'bg-gradient-to-r from-gold-50 to-flame-50 text-flame-700' : 'text-gray-600'
                      }`}
                    >
                      {pending ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <item.icon className="h-4 w-4" />}
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
                <button type="button" onClick={handleLogout} className="mt-2 flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-700"><LogOut className="h-4 w-4" />Sign Out</button>
              </nav>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="relative flex-1 p-6 lg:p-8" aria-busy={pendingHref !== null}>
          {pendingHref && <div className="absolute inset-x-0 top-0 h-0.5 overflow-hidden bg-flame-100" role="status" aria-label="Loading admin page"><div className="h-full w-1/3 animate-pulse rounded-full bg-flame-500" /></div>}
          {children}
        </main>
      </div>
    </div>
  );
}
