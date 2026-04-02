'use client';

import { motion } from 'framer-motion';

export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center bg-background overflow-hidden relative">
      
      {/* Background Subtle Gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.03)_0%,transparent_50%)] pointer-events-none" />

      <div className="relative flex flex-col items-center justify-center gap-8">
        
        {/* Animated Geometry Elements */}
        <div className="relative h-24 w-24 flex items-center justify-center">
          
          {/* Outer Ring */}
          <motion.div
            className="absolute inset-0 rounded-full border border-primary/20"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Inner Spinning Gradient Ring */}
          <motion.div
            className="absolute inset-2 rounded-full border-t-2 border-r-2 border-primary border-b-2 border-b-transparent border-l-2 border-l-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          />

          {/* Center Pulsing Dot */}
          <motion.div
            className="h-4 w-4 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.6)] rounded-full"
            animate={{ scale: [0.8, 1.3, 0.8] }}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Text Area */}
        <div className="flex flex-col items-center gap-2 z-10">
          <motion.div 
            className="text-lg font-bold bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent tracking-widest uppercase text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            DreamTask
          </motion.div>

          <motion.div 
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-widest"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            {/* Blinking dots for standard loading feel but modern typed ... */}
            <span>System Loading</span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, delay: 0.2, repeat: Infinity }}
            >
              .
            </motion.span>
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, delay: 0.4, repeat: Infinity }}
            >
              .
            </motion.span>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
