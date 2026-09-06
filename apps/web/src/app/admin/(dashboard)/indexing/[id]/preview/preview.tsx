'use client';
import dynamic from 'next/dynamic';
export const PdfPreview=dynamic(()=>import('./preview-client'),{ssr:false,loading:()=> <p role="status">Loading PDF viewer…</p>});
