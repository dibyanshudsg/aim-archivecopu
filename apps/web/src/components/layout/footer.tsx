import Image from 'next/image';
import Link from 'next/link';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-gold-100 bg-gold-50/50">
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
                <Link href="/browse" className="text-sm text-gray-500 hover:text-gold-700">
                  Browse All Issues
                </Link>
              </li>
              <li>
                <Link href="/search" className="text-sm text-gray-500 hover:text-gold-700">
                  Search Archive
                </Link>
              </li>
              <li>
                <Link href="/bookmarks" className="text-sm text-gray-500 hover:text-gold-700">
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
                  href="/browse?magazine=aim"
                  className="text-sm text-gray-500 hover:text-gold-700"
                >
                  All India Magazine
                </Link>
              </li>
              <li>
                <Link
                  href="/browse?magazine=agnisikha"
                  className="text-sm text-gray-500 hover:text-gold-700"
                >
                  Agnisikha
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
                  className="text-sm text-gray-500 hover:text-gold-700"
                >
                  Sri Aurobindo Society
                </a>
              </li>
              <li>
                <a
                  href="https://aim.aurosociety.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-500 hover:text-gold-700"
                >
                  AIM Website
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-gold-100 pt-8">
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
