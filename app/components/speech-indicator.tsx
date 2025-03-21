"use client"

import { motion } from "framer-motion"

interface SpeechIndicatorProps {
  isActive: boolean
}

export default function SpeechIndicator({ isActive }: SpeechIndicatorProps) {
  if (!isActive) return null

  return (
    <div className="flex items-center gap-1">
      <motion.div
        className="w-1.5 h-1.5 bg-accent rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0 }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-accent rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0.2 }}
      />
      <motion.div
        className="w-1.5 h-1.5 bg-accent rounded-full"
        animate={{ scale: [1, 1.5, 1] }}
        transition={{ repeat: Number.POSITIVE_INFINITY, duration: 0.8, delay: 0.4 }}
      />
      <span className="text-xs text-muted-foreground ml-1">Listening...</span>
    </div>
  )
}

