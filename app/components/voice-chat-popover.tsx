"use client"
import { motion, AnimatePresence } from "framer-motion"
import { Mic, X, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import AudioWaveAnimation from "./audio-wave-animation"
import { mapLanguageToLocale } from "../utils/speech-utils"
import type { Language } from "../types"

interface VoiceChatPopoverProps {
  isOpen: boolean
  onClose: () => void
  onSpeechInput: (text: string) => void
  language: Language
  isSpeaking: boolean
  isListening: boolean
  transcript: string
  startListening: () => void
  stopListening: () => void
}

export default function VoiceChatPopover({
  isOpen,
  onClose,
  onSpeechInput,
  language,
  isSpeaking,
  isListening,
  transcript,
  startListening,
  stopListening,
}: VoiceChatPopoverProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-background/95 backdrop-blur-md border border-primary/20 rounded-2xl shadow-lg p-4 w-[320px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Voice Chat
              </h3>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex flex-col items-center justify-center gap-4">
              {/* Wave Visualization */}
              <div className="relative h-16 w-full flex items-center justify-center">
                {isListening ? (
                  <div className="scale-150">
                    <AudioWaveAnimation isActive={true} isListening={true} />
                  </div>
                ) : isSpeaking ? (
                  <div className="scale-150">
                    <AudioWaveAnimation isActive={true} isListening={false} />
                  </div>
                ) : (
                  <div className="text-muted-foreground text-sm">Press the microphone to start speaking</div>
                )}
              </div>

              {/* Transcript Display */}
              {transcript && (
                <div className="w-full bg-primary/5 rounded-lg p-3 text-sm">
                  <p className="text-foreground">{transcript}</p>
                  <motion.div
                    className="h-0.5 bg-primary/50 mt-2"
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 3, ease: "linear" }}
                  />
                </div>
              )}

              {/* Controls */}
              <div className="flex items-center gap-4 mt-2">
                <Button
                  variant={isListening ? "default" : "outline"}
                  size="icon"
                  className={`rounded-full h-12 w-12 ${isListening ? "bg-accent text-accent-foreground" : ""}`}
                  onClick={isListening ? stopListening : startListening}
                >
                  <Mic className="h-5 w-5" />
                </Button>

                <div className="text-xs text-muted-foreground">
                  {isListening ? "Listening..." : isSpeaking ? "Speaking..." : "Voice mode active"}
                </div>
              </div>

              <div className="text-xs text-muted-foreground mt-2">Using {mapLanguageToLocale(language)} voice</div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

