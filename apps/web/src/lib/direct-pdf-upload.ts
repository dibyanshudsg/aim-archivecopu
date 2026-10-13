/** Browser-only upload: large PDF bodies go straight to authenticated R2 PUT. */
export async function uploadPdfDirect(file: File, metadata: { issue_id: string } | { magazine_id: string; year: number }) {
  const response = await fetch('/api/admin/upload/presign', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...metadata, filename: file.name, content_type: file.type, size: file.size }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not authorize upload');
  const upload = await fetch(result.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file, referrerPolicy: 'no-referrer' });
  if (!upload.ok) throw new Error('Storage upload failed. Check storage access and CORS settings.');
  return result as { publicUrl: string; storageKey: string; uploadTicket: string };
}
