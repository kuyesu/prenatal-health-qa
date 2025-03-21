"use client"

import { motion } from "framer-motion"

interface AudioWaveAnimationProps {
  isActive: boolean
  isListening?: boolean
  className?: string
}

export default function AudioWaveAnimation({ isActive, isListening = false, className = "" }: AudioWaveAnimationProps) {
  // Different heights for the bars to create a wave effect
  const barHeights = [3, 5, 7, 9, 11, 9, 7, 5, 3]

  // Different colors for speaking vs listening
  const barColor = isListening ? "bg-accent" : "bg-primary"

  return (
    <div className={`flex items-center gap-[2px] h-5 ${className}`}>
      {barHeights.map((height, index) => (
        <motion.div
          key={index}
          className={`w-[2px] rounded-full ${barColor}`}
          initial={{ height: 3 }}
          animate={
            isActive
              ? {
                  height: [3, height, 3],
                  opacity: [0.7, 1, 0.7],
                }
              : { height: 3, opacity: 0.5 }
          }
          transition={{
            duration: isListening ? 0.4 : 0.6,
            repeat: isActive ? Number.POSITIVE_INFINITY : 0,
            repeatType: "reverse",
            delay: index * 0.05,
          }}
        />
      ))}
    </div>
  )
}

