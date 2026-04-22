'use client';

import { motion } from 'framer-motion';

interface BookProps {
  title: string;
  subtitle: string;
  color: string;
  accentColor: string;
  delay: number;
  height: number;
  width: number;
}

const books: BookProps[] = [
  {
    title: 'AIM',
    subtitle: 'Jan 2024',
    color: '#FDF9E4',
    accentColor: '#D4A843',
    delay: 0,
    height: 200,
    width: 140,
  },
  {
    title: 'Agnisikha',
    subtitle: 'Mar 2024',
    color: '#FEECDC',
    accentColor: '#E5561F',
    delay: 0.1,
    height: 220,
    width: 148,
  },
  {
    title: 'AIM',
    subtitle: 'Feb 2025',
    color: '#FEF3C7',
    accentColor: '#BE8C2E',
    delay: 0.2,
    height: 210,
    width: 144,
  },
  {
    title: 'AIM',
    subtitle: 'Apr 2026',
    color: '#FFF8F1',
    accentColor: '#F47234',
    delay: 0.3,
    height: 200,
    width: 140,
  },
  {
    title: 'Agnisikha',
    subtitle: 'Dec 2025',
    color: '#FDF9E4',
    accentColor: '#9E6D24',
    delay: 0.4,
    height: 216,
    width: 146,
  },
  {
    title: 'AIM',
    subtitle: 'Sep 2023',
    color: '#FEECDC',
    accentColor: '#D4A843',
    delay: 0.5,
    height: 204,
    width: 142,
  },
  {
    title: 'AIM',
    subtitle: 'Jun 2024',
    color: '#FEF3C7',
    accentColor: '#E5561F',
    delay: 0.6,
    height: 210,
    width: 144,
  },
];

function Book({ title, subtitle, color, accentColor, delay, height, width }: BookProps) {
  return (
    <motion.div
      className="group relative cursor-pointer"
      style={{ width, height }}
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        delay: 0.3 + delay,
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -10 }}
    >
      {/* Book body */}
      <div
        className="relative flex h-full w-full flex-col overflow-hidden rounded-r-md rounded-l-sm shadow-lg transition-shadow duration-300 group-hover:shadow-2xl"
        style={{ backgroundColor: color }}
      >
        {/* Spine edge */}
        <div
          className="absolute top-0 left-0 h-full w-[6px]"
          style={{
            background: `linear-gradient(180deg, ${accentColor}CC, ${accentColor})`,
          }}
        />

        {/* Top decorative bar */}
        <div
          className="mx-4 mt-5 h-[2px] rounded-full"
          style={{ backgroundColor: accentColor, opacity: 0.4 }}
        />

        {/* Flame/lotus icon */}
        <div className="mt-4 flex justify-center">
          <svg
            width="36"
            height="44"
            viewBox="0 0 36 44"
            fill="none"
            className="opacity-70 transition-opacity group-hover:opacity-100"
          >
            {/* Outer flame */}
            <path
              d="M18 2C18 2 6 16 6 26C6 32.627 11.373 38 18 38C24.627 38 30 32.627 30 26C30 16 18 2 18 2Z"
              fill={accentColor}
              fillOpacity={0.15}
            />
            {/* Inner flame */}
            <path
              d="M18 12C18 12 11 21 11 27C11 30.866 14.134 34 18 34C21.866 34 25 30.866 25 27C25 21 18 12 18 12Z"
              fill={accentColor}
              fillOpacity={0.35}
            />
            {/* Core glow */}
            <ellipse cx="18" cy="28" rx="4" ry="5" fill={accentColor} fillOpacity={0.5} />
          </svg>
        </div>

        {/* Title */}
        <div className="mt-auto px-3 pb-5">
          <p
            className="text-center text-sm font-bold tracking-wide"
            style={{ color: accentColor }}
          >
            {title}
          </p>
          <p className="mt-1 text-center text-[10px] tracking-widest text-gray-400 uppercase">
            {subtitle}
          </p>
        </div>

        {/* Bottom decorative bar */}
        <div
          className="mx-4 mb-4 h-[2px] rounded-full"
          style={{ backgroundColor: accentColor, opacity: 0.4 }}
        />

        {/* Subtle page edge effect on right */}
        <div className="absolute top-2 right-0 bottom-2 w-[3px] rounded-r-sm bg-gradient-to-l from-black/[0.06] to-transparent" />
      </div>

      {/* Book shadow on shelf */}
      <div className="absolute -bottom-1 left-2 right-2 h-2 rounded-full bg-black/[0.06]" />
    </motion.div>
  );
}

function Shelf({ delay }: { delay: number }) {
  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay, duration: 0.5 }}
    >
      {/* Shelf surface */}
      <div className="h-[8px] rounded-sm bg-gradient-to-b from-amber-700/20 to-amber-800/25" />
      {/* Shelf front edge */}
      <div className="h-[4px] rounded-b-sm bg-gradient-to-b from-amber-800/20 to-amber-900/10" />
      {/* Shelf shadow */}
      <div className="h-[6px] bg-gradient-to-b from-black/[0.04] to-transparent" />
    </motion.div>
  );
}

export function AnimatedBookshelf() {
  const topRow = books.slice(0, 4);
  const bottomRow = books.slice(4);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <motion.div
        className="relative"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
      >
        {/* Bookshelf frame */}
        <div className="rounded-xl border border-gold-200/60 bg-gradient-to-b from-white to-gold-50/50 p-6 shadow-sm sm:p-8">
          {/* Top shelf books */}
          <div className="mb-0 flex items-end justify-center gap-3 sm:gap-4">
            {topRow.map((book, i) => (
              <Book key={`top-${i}`} {...book} />
            ))}
          </div>

          {/* Top shelf */}
          <Shelf delay={0.4} />

          {/* Bottom shelf books */}
          <div className="mt-4 mb-0 flex items-end justify-center gap-3 sm:gap-4">
            {bottomRow.map((book, i) => (
              <Book key={`bottom-${i}`} {...book} delay={book.delay + 0.2} />
            ))}
          </div>

          {/* Bottom shelf */}
          <Shelf delay={0.6} />
        </div>

      </motion.div>
    </div>
  );
}
