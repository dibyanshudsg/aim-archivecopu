'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Search, Download, Globe } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { AnimatedBookshelf } from '@/components/home/animated-bookshelf';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const features = [
  {
    icon: BookOpen,
    title: 'Read Online',
    description: 'Browse and read any issue directly in your browser with our smooth PDF viewer.',
  },
  {
    icon: Search,
    title: 'Search Everything',
    description:
      'Full-text search across every issue ever published. Find exactly what you need.',
  },
  {
    icon: Download,
    title: 'Download & Offline',
    description: 'Download issues in PDF, EPUB, or MOBI. Read offline anytime, anywhere.',
  },
  {
    icon: Globe,
    title: 'Multiple Languages',
    description:
      'Archives in English, Hindi, Tamil, Marathi, Bengali and more — all in one place.',
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-gold-50 to-white px-6 py-24 sm:py-32 lg:px-8">
          <motion.div
            className="relative mx-auto max-w-3xl text-center"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <span className="inline-block rounded-full bg-gold-100 px-4 py-1.5 text-sm font-medium text-gold-700">
                Sri Aurobindo Society
              </span>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="font-heading text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl lg:text-7xl"
            >
              The Living Archive
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mt-6 text-lg leading-relaxed text-gray-600 sm:text-xl"
            >
              Decades of spiritual wisdom from{' '}
              <span className="font-medium text-gold-700">Sri Aurobindo</span> and{' '}
              <span className="font-medium text-gold-700">The Mother</span>, preserved and
              accessible to all. Explore the complete archive of All India Magazine, Agnisikha, and
              more.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex items-center justify-center gap-4">
              <Link
                href="/browse"
                className="rounded-xl bg-gold-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gold-500/25 transition-all hover:bg-gold-600 hover:shadow-xl hover:shadow-gold-500/30"
              >
                Browse Archive
              </Link>
              <Link
                href="/search"
                className="rounded-xl border border-gray-200 bg-white px-8 py-3.5 text-base font-semibold text-gray-700 shadow-sm transition-all hover:border-gold-300 hover:bg-gold-50"
              >
                Search Issues
              </Link>
            </motion.div>
          </motion.div>

          {/* Animated Bookshelf */}
          <motion.div
            className="relative mx-auto mt-16 max-w-4xl"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          >
            <AnimatedBookshelf />
          </motion.div>

          {/* Archive Stats */}
          <motion.div
            className="relative mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-8 border-t border-gold-100 pt-10 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.6 }}
          >
            {[
              { label: 'Issues Archived', value: '850+' },
              { label: 'Years of Wisdom', value: '35+' },
              { label: 'Languages', value: '6' },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="font-heading text-3xl font-bold text-gold-600 sm:text-4xl">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="px-6 py-20 lg:px-8">
          <motion.div
            className="mx-auto max-w-5xl"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} className="text-center">
              <h2 className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl">
                Everything you need
              </h2>
              <p className="mt-4 text-lg text-gray-600">
                A complete platform to explore, read, and preserve spiritual literature.
              </p>
            </motion.div>

            <div className="mt-16 grid gap-8 sm:grid-cols-2">
              {features.map((feature) => (
                <motion.div
                  key={feature.title}
                  variants={fadeInUp}
                  className="group rounded-2xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:border-gold-200 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold-50 text-gold-600 transition-colors group-hover:bg-gold-100">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray-600">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-b from-white to-gold-50 px-6 py-20 lg:px-8">
          <motion.div
            className="mx-auto max-w-2xl text-center"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2
              variants={fadeInUp}
              className="font-heading text-3xl font-bold text-gray-900 sm:text-4xl"
            >
              Begin your exploration
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600">
              Dive into the treasury of spiritual knowledge. Every issue, every article, always free.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-8">
              <Link
                href="/browse"
                className="inline-block rounded-xl bg-gold-500 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-gold-500/25 transition-all hover:bg-gold-600 hover:shadow-xl"
              >
                Explore the Archive
              </Link>
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
