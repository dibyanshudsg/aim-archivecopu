import { BookCopy, FileText, HardDrive, LayoutDashboard, Search, Settings, ShieldCheck, Upload, UserRound, type LucideIcon } from 'lucide-react';

const icons: Record<string, LucideIcon> = {
  Dashboard: LayoutDashboard,
  Magazines: BookCopy,
  Issues: FileText,
  'Search Indexing': Search,
  Storage: HardDrive,
  Settings,
  'Admin Users': UserRound,
  'Roles & Permissions': ShieldCheck,
  'Your account': UserRound,
  'Bulk Upload': Upload,
  'Upload New Issue': Upload,
  Navigation: LayoutDashboard,
};

export function AdminPageTitle({ title, description }: { title: string; description?: string }) {
  const Icon = icons[title] ?? FileText;
  return <div className="flex items-center gap-3">
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-flame-50 text-flame-700" aria-hidden="true"><Icon className="h-5 w-5" /></span>
    <div className="min-w-0"><h1 className="font-heading text-2xl font-bold text-gray-900">{title}</h1>{description && <p className="mt-1 text-sm text-gray-600">{description}</p>}</div>
  </div>;
}
