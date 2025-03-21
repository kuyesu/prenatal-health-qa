"use client"

import { useState, useEffect } from "react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Volume2, Mic } from "lucide-react"
import { motion } from "framer-motion"

export default function VoiceTooltip() {
  const [open, setOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  // Show tooltip after 2 seconds
  useEffect(() => {
    const tooltipShown = localStorage.getItem("voiceTooltipShown")

    if (!tooltipShown) {
      const timer = setTimeout(() => {
        setOpen(true)
      }, 2000)

      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    setOpen(false)
    setDismissed(true)
    localStorage.setItem("voiceTooltipShown", "true")
  }

  if (dismissed) {
    return null
  }

  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <motion.div
            className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-primary/10 rounded-full p-2"
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
          >
            <div className="flex items-center gap-2">
              <Mic className="h-5 w-5 text-primary" />
              <Volume2 className="h-5 w-5 text-primary" />
            </div>
          </motion.div>
        </TooltipTrigger>
        <TooltipContent side="top" className="p-4 max-w-xs">
          <div className="space-y-2">
            <h3 className="font-medium">Voice Controls Available!</h3>
            <p className="text-sm">
              You can speak your questions or listen to responses with our voice controls. Click the microphone to start
              speaking or the speaker to hear responses.
            </p>
            <div className="flex justify-end pt-2">
              <Button size="sm" onClick={handleDismiss}>
                Got it
              </Button>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

