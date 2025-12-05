'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export const AnimatedBackground = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {return null;}

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base Gradient */}
      <div className="absolute inset-0 bg-background [background:radial-gradient(125%_125%_at_50%_10%,#fff_40%,#63e_100%)] dark:[background:radial-gradient(125%_125%_at_50%_10%,#000_40%,#63e_100%)] opacity-30" />

      {/* Floating Orbs with stronger colors and movement */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-primary/40 blur-[80px] mix-blend-multiply dark:mix-blend-screen"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        className="absolute top-[20%] right-[-10%] w-[40vw] h-[40vw] rounded-full bg-secondary/40 blur-[80px] mix-blend-multiply dark:mix-blend-screen"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
          rotate: [0, -60, 0],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 2,
        }}
      />

      <motion.div
        className="absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] rounded-full bg-accent/30 blur-[80px] mix-blend-multiply dark:mix-blend-screen"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
          rotate: [0, 45, 0],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: 'easeInOut',
          delay: 5,
        }}
      />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] dark:opacity-[0.05]" />
    </div>
  );
};
