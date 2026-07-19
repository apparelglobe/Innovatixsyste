import Image from 'next/image';

/**
 * Innovatix logo — always its natural aspect ratio (480×191). We set a fixed
 * responsive HEIGHT and let the width be automatic (never both forced), with
 * object-contain as a guard, so it can never stretch, squash, crop, or distort.
 * The dark logo art sits on a white chip for contrast on dark portal surfaces.
 * The wrapper is shrink-0 so a tight flex row never compresses it.
 */
export function Logo({ className = 'h-8 w-auto', priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-lg bg-white px-2 py-1">
      <Image
        src="/innovatix-logo.png"
        alt="Innovatix Marketing"
        width={480}
        height={191}
        priority={priority}
        sizes="220px"
        className={`${className} object-contain`}
      />
    </span>
  );
}
