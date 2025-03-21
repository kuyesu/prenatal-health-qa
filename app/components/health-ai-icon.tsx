"use client"

import { motion } from "framer-motion"
import { Heart, Activity, Stethoscope } from "lucide-react"
import { useState, useEffect } from "react"

interface HealthAIIconProps {
  isResponding?: boolean
  className?: string
}

export default function HealthAIIcon({ isResponding = false, className = "" }: HealthAIIconProps) {
  const [icon, setIcon] = useState<number>(0)

  useEffect(() => {
    if (isResponding) {
      const interval = setInterval(() => {
        setIcon((prev) => (prev + 1) % 3)
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [isResponding])

  const icons = [
    <Heart key="heart" className="text-accent" />,
    <Activity key="activity" className="text-primary" />,
    <Stethoscope key="stethoscope" className="text-secondary" />,
  ]

  return (
    <motion.div
      className={`relative rounded-full bg-background p-2 border border-primary/20 shadow-sm ${className}`}
      animate={isResponding ? { scale: [1, 1.05, 1] } : {}}
      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
    >
      {isResponding ? (
        <div className="relative w-6 h-6 flex items-center justify-center">
          <motion.div className="absolute" animate={{ opacity: icon === 0 ? 1 : 0 }} transition={{ duration: 0.5 }}>
            {icons[0]}
          </motion.div>
          <motion.div className="absolute" animate={{ opacity: icon === 1 ? 1 : 0 }} transition={{ duration: 0.5 }}>
            {icons[1]}
          </motion.div>
          <motion.div className="absolute" animate={{ opacity: icon === 2 ? 1 : 0 }} transition={{ duration: 0.5 }}>
            {icons[2]}
          </motion.div>
        </div>
      ) : (
        <Stethoscope className="w-6 h-6 text-primary" />
      )}

      {isResponding && (
        <motion.div
          className="absolute inset-0 rounded-full border border-primary"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
          transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
        />
      )}
    </motion.div>
  )
}

