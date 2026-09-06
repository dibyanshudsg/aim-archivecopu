'use client';
import {useEffect,useRef,useState} from 'react';
import {Document,Page,pdfjs} from 'react-pdf';
import {configurePdfWorker} from '@/lib/pdf-worker-client';
configurePdfWorker(pdfjs);
const button='min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-flame-600';
export default function PdfPreviewClient({url,initialPage}:{url:string;initialPage:number}){
  const [page,setPage]=useState(initialPage),[total,setTotal]=useState(0),[width,setWidth]=useState(600),[retry,setRetry]=useState(0);
  const container=useRef<HTMLDivElement>(null);
  useEffect(()=>{const node=container.current;if(!node)return;const observer=new ResizeObserver(()=>setWidth(Math.min(800,Math.max(200,node.clientWidth-24))));observer.observe(node);return()=>observer.disconnect();},[]);
  return <div ref={container} className="space-y-4"><nav aria-label="PDF pages" className="flex flex-wrap items-center gap-3"><button className={button} disabled={!total||page<=1} onClick={()=>setPage(n=>n-1)}>Previous</button><label className="text-sm text-gray-700">Page <input aria-label="PDF page number" type="number" min={1} max={total||1} value={page} disabled={!total} onChange={e=>setPage(Math.min(total,Math.max(1,Number(e.target.value)||1)))} className="min-h-10 w-20 rounded-lg border border-gray-300 px-2"/> of {total||'…'}</label><button className={button} disabled={!total||page>=total} onClick={()=>setPage(n=>n+1)}>Next</button></nav><div className="overflow-hidden rounded-xl border border-gray-200 bg-gray-100 p-3"><Document key={retry} file={url} onLoadSuccess={({numPages})=>{setTotal(numPages);setPage(n=>Math.min(numPages,n));}} loading={<p role="status">Loading PDF…</p>} error={<div role="alert" className="space-y-3 text-sm text-red-700"><p>The PDF could not be loaded. Check the source or try again.</p><button className={button} onClick={()=>setRetry(n=>n+1)}>Retry PDF</button></div>}><Page pageNumber={page} width={width} renderAnnotationLayer={false} renderTextLayer={false} loading={<p role="status">Rendering page…</p>}/></Document></div></div>;
}
