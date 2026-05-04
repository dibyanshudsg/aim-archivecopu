'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { MessageSquareText } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const [feedbackFormUrl, setFeedbackFormUrl] = useState('');

  useEffect(() => {
    fetch('/api/site-settings')
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((settings: { feedback_form_url?: string }) => {
        setFeedbackFormUrl(settings.feedback_form_url?.trim() ?? '');
      })
      .catch(() => setFeedbackFormUrl(''));
  }, []);

  return (
    <footer className="border-t border-flame-100 bg-gradient-to-b from-flame-50/40 to-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-3">
              <Image src="/logo.png" alt="AIM Archive" width={40} height={40} className="rounded-lg object-cover" />
              <span className="font-heading text-lg font-bold text-gray-900">AIM Archive</span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-gray-500">
              Preserving decades of spiritual wisdom from Sri Aurobindo and The Mother for
              seekers worldwide.
            </p>
          </div>

          {/* Archive */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Archive</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link href="/browse" className="text-sm text-gray-500 hover:text-flame-700">
                  Browse All Issues
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-gray-500 hover:text-flame-700">
                  Search Archive
                </Link>
              </li>
              <li>
                <Link href="/bookmarks" className="text-sm text-gray-500 hover:text-flame-700">
                  My Bookmarks
                </Link>
              </li>
            </ul>
          </div>

          {/* Magazines */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Magazines</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href="/browse?magazine=all-india-magazine"
                  className="text-sm text-gray-500 hover:text-flame-700"
                >
                  All India Magazine
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?magazine=agnishikha"
                  className="text-sm text-gray-500 hover:text-flame-700"
                >
                  Agnishikha
                </Link>
              </li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">About</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <a
                  href="https://aurosociety.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-flame-700"
                >
                  Sri Aurobindo Society
                </a>
              </li>
              <li>
                <a
                  href="https://aim.aurosociety.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-flame-700"
                >
                  AIM Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        {feedbackFormUrl && (
          <div className="mt-10 flex justify-center border-t border-flame-100 pt-8">
            <a
              href={feedbackFormUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-gold-500 to-flame-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(190,140,46,0.18)] transition-all hover:from-gold-600 hover:to-flame-600"
            >
              <MessageSquareText className="h-4 w-4" />
              Share feedback
            </a>
          </div>
        )}

        <div className={`${feedbackFormUrl ? 'mt-8' : 'mt-12 border-t border-flame-100 pt-8'} flex items-center justify-between`}>
          <p className="text-sm text-gray-400">
            &copy; {currentYear} Sri Aurobindo Society. All rights reserved.
          </p>
          <Link
            href="/admin/login"
            className="text-xs text-gray-300 transition-colors hover:text-gray-500"
          >
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
