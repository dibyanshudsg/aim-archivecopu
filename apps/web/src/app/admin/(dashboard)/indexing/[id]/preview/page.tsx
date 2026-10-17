import { notFound,redirect } from 'next/navigation';
import Link from 'next/link';
import { verifyAdmin } from '@/lib/admin-auth';
import { getAdminIssueFileRowFromDb } from '@/lib/db';
import { PdfPreview } from './preview';
export const dynamic='force-dynamic';
export default async function PreviewPage({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{page?:string}>}){
  if(!await verifyAdmin('indexing.view'))redirect('/admin/login');
  const {id}=await params;const issue=await getAdminIssueFileRowFromDb(id);if(!issue)notFound();
  const page=Number((await searchParams).page)||1;
  return <div className="space-y-4"><Link href="/admin/indexing" className="text-sm font-medium text-flame-700 underline underline-offset-4">Back to Search Indexing</Link><h1 className="font-heading text-xl font-bold text-gray-900">{issue.title}</h1><p className="text-sm text-gray-600">Admin PDF review. This preview does not change publication or public access.</p><PdfPreview url={`/api/admin/issues/${issue.id}/pdf`} initialPage={Math.max(1,Math.floor(page))}/></div>;
}
