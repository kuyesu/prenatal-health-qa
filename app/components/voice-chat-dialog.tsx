'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AudioWaveAnimation from './audio-wave-animation'
import type { Language } from '../types'
import HealthAIIcon from './health-ai-icon'
import Image from 'next/image'

interface VoiceChatDialogProps {
  isOpen: boolean
  onClose: () => void
  onSpeechInput: (text: string) => void
  language: Language
  isSpeaking: boolean
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
  lastResponse?: string
}

export default function VoiceChatDialog({
  isOpen,
  onClose,
  onSpeechInput,
  language,
  isSpeaking,
  isListening,
  transcript,
  startListening,
  stopListening,
  lastResponse,
}: VoiceChatDialogProps) {
  const [showInstructions, setShowInstructions] = useState(true)
  const [internalTranscript, setInternalTranscript] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  // Auto-hide instructions after 5 seconds
  useEffect(() => {
    if (isOpen && showInstructions) {
      const timer = setTimeout(() => {
        setShowInstructions(false)
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, showInstructions])

  // Update internal transcript when external transcript changes
  useEffect(() => {
    if (transcript) {
      setInternalTranscript(transcript)
      setHasSubmitted(false)
    }
  }, [transcript])

  // Handle dialog open/close
  useEffect(() => {
    if (isOpen) {
      // Reset state when dialog opens
      setInternalTranscript('')
      setHasSubmitted(false)
      setIsClosing(false)

      // Make sure we're not already listening
      if (isListening) {
        stopListening()
      }

      // Small delay before starting to listen
      const timer = setTimeout(() => {
        if (isOpen && !isClosing) {
          startListening()
        }
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [isOpen, isListening, startListening, stopListening, isClosing])

  // Handle transcript submission
  useEffect(() => {
    // If we have a transcript and we're not listening anymore, submit it
    if (internalTranscript && !isListening && !hasSubmitted && !isClosing) {
      const timer = setTimeout(() => {
        if (internalTranscript.trim()) {
          onSpeechInput(internalTranscript)
          setHasSubmitted(true)

          // Clear transcript after submission
          setTimeout(() => {
            setInternalTranscript('')

            // Start listening again after submission with a delay
            const listenTimer = setTimeout(() => {
              if (isOpen && !isClosing) {
                startListening()
              }
            }, 1500)

            return () => clearTimeout(listenTimer)
          }, 500)
        }
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [
    internalTranscript,
    isListening,
    hasSubmitted,
    onSpeechInput,
    isOpen,
    startListening,
    isClosing,
  ])

  // Handle microphone button click
  const handleMicrophoneClick = () => {
    if (isListening) {
      stopListening()
    } else {
      // Clear transcript before starting
      setInternalTranscript('')
      setHasSubmitted(false)
      startListening()
    }
  }

  // Handle close button click
  const handleClose = () => {
    // Set closing state to prevent new listening sessions
    setIsClosing(true)

    // Make sure to stop listening before closing
    if (isListening) {
      stopListening()
    }

    // Small delay to ensure recognition is fully stopped
    setTimeout(() => {
      onClose()
    }, 300)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="border-b border-border p-4 flex items-center justify-between">
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <h2 className="text-lg font-medium">Voice Chat Mode</h2>
              <div className="w-10"></div> {/* Spacer for alignment */}
            </div>

            {/* Main content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {/* Instructions */}
              <AnimatePresence>
                {showInstructions && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="bg-primary/5 rounded-xl p-4 mb-8 max-w-md text-center"
                  >
                    <p className="text-sm text-foreground mb-2">
                      Tap the microphone and speak your question clearly.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Your question will be submitted automatically after you finish speaking.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowInstructions(false)}
                    >
                      Got it
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Wave Visualization */}
              <div className="relative h-32 w-full flex items-center justify-center mb-8">
                {isListening ? (
                  <div className="scale-150">
                    <AudioWaveAnimation isActive={true} isListening={true} className="scale-150" />
                  </div>
                ) : isSpeaking ? (
                  <div className="scale-150">
                    <AudioWaveAnimation isActive={true} isListening={false} className="scale-150" />
                  </div>
                ) : (
                  <div className="text-muted-foreground text-center justify-center flex flex-col items-center">
                    <Image alt="" src="/logo.png" width={120} height={120} />
                    <p>Tap the microphone to start speaking</p>
                  </div>
                )}
              </div>

              {/* Transcript Display */}
              {internalTranscript && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md bg-primary/5 rounded-lg p-4 mb-8"
                >
                  <h3 className="text-sm font-medium mb-2">Your question:</h3>
                  <p className="text-foreground">{internalTranscript}</p>
                  <motion.div
                    className="h-0.5 bg-primary/50 mt-4"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                  />
                </motion.div>
              )}

              {/* Last Response */}
              {lastResponse && !internalTranscript && !hasSubmitted && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full max-w-md bg-secondary/10 rounded-lg p-4 mb-8 max-h-48 overflow-y-auto"
                >
                  <h3 className="text-sm font-medium mb-2">Last response:</h3>
                  <p className="text-foreground text-sm">{lastResponse}</p>
                </motion.div>
              )}

              {/* Status Text */}
              <div className="text-sm text-muted-foreground mb-8 text-center">
                {isListening ? (
                  <p className="animate-pulse">Listening...</p>
                ) : isSpeaking ? (
                  <p>Speaking...</p>
                ) : hasSubmitted ? (
                  <p>Processing your question...</p>
                ) : (
                  <p>Ready for your question</p>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="border-t border-border p-6 flex justify-center">
              <Button
                variant={isListening ? 'default' : 'outline'}
                size="icon"
                className={`rounded-full h-16 w-16 ${
                  isListening ? 'bg-accent text-accent-foreground' : ''
                }`}
                onClick={handleMicrophoneClick}
              >
                <Mic className="h-6 w-6 " />
              </Button>
            </div>

            <div className="text-xs text-center text-muted-foreground pb-4">
              Using English voice (best compatibility)
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
