"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface MedicalDisclaimerProps {
  onAccept: () => void
}

export default function MedicalDisclaimer({ onAccept }: MedicalDisclaimerProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleAccept = () => {
    setIsVisible(false)
    setTimeout(() => {
      onAccept()
    }, 500)
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background rounded-2xl p-6 max-w-md mx-4 shadow-xl border border-border"
          >
            <div className="mb-4 flex items-center gap-3 text-accent">
              <AlertTriangle className="h-6 w-6" />
              <h2 className="text-xl font-bold">Medical Disclaimer</h2>
            </div>

            <div className="space-y-3 text-foreground">
              <p>
                The information provided by this application is for informational and educational purposes only. It is
                not intended to be a substitute for professional medical advice, diagnosis, or treatment.
              </p>

              <p>
                <strong>Always seek the advice of qualified healthcare providers</strong> with any questions you may
                have regarding pregnancy, childbirth, or other medical conditions.
              </p>

              <p>
                In case of a medical emergency, please contact your healthcare provider or go to the nearest emergency
                room immediately.
              </p>
            </div>

            <div className="mt-6 text-center">
              <Button onClick={handleAccept} className="bg-primary hover:bg-primary/90 text-white rounded-full px-6">
                I Understand
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

