"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Mic, MicOff, Volume2, VolumeX, User, UserRound, Loader2, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { useToast } from "@/hooks/use-toast"
import { preprocessTextForSpeech, chunkTextForSpeech, mapLanguageToLocale, getBestVoice } from "../utils/speech-utils"
import AudioWaveAnimation from "./audio-wave-animation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface VoiceControlsProps {
  onSpeechInput: (text: string) => void
  textToSpeak?: string
  language: string
  onVoiceChatToggle?: () => void
  isListeningState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
  isSpeakingState?: [boolean, React.Dispatch<React.SetStateAction<boolean>>]
  transcriptState?: [string, React.Dispatch<React.SetStateAction<string>>]
}

// Declare SpeechRecognition
declare global {
  interface Window {
    SpeechRecognition: any
    webkitSpeechRecognition: any
    SpeechSynthesisUtterance: any
  }
}

export default function VoiceControls({
  onSpeechInput,
  textToSpeak,
  language,
  onVoiceChatToggle,
  isListeningState,
  isSpeakingState,
  transcriptState,
}: VoiceControlsProps) {
  // Use provided state or create local state
  const [localIsListening, setLocalIsListening] = useState(false)
  const [localIsSpeaking, setLocalIsSpeaking] = useState(false)
  const [localTranscript, setLocalTranscript] = useState("")

  const isListening = isListeningState ? isListeningState[0] : localIsListening
  const setIsListening = isListeningState ? isListeningState[1] : setLocalIsListening
  const isSpeaking = isSpeakingState ? isSpeakingState[0] : localIsSpeaking
  const setIsSpeaking = isSpeakingState ? isSpeakingState[1] : setLocalIsSpeaking
  const transcript = transcriptState ? transcriptState[0] : localTranscript
  const setTranscript = transcriptState ? transcriptState[1] : setLocalTranscript

  const [isMuted, setIsMuted] = useState(false)
  const [useFemaleVoice, setUseFemaleVoice] = useState(true)
  const [voicesLoaded, setVoicesLoaded] = useState(false)
  const [isLoadingVoices, setIsLoadingVoices] = useState(true)
  const [loadingChunk, setLoadingChunk] = useState(false)
  const [recognitionError, setRecognitionError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  // Refs
  const recognitionRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const voiceLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isRecognitionActiveRef = useRef(false)
  const startTimeRef = useRef<number | null>(null)
  const { toast } = useToast()

  // Constants
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000
  const MIN_RECOGNITION_TIME = 1000 // Minimum time in ms that recognition should run before we consider a retry

  // Check browser support for speech recognition and synthesis
  const speechRecognitionSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

  const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window

  // Load voices when component mounts
  useEffect(() => {
    if (!speechSynthesisSupported) {
      setIsLoadingVoices(false)
      return
    }

    setIsLoadingVoices(true)
    console.log("Loading voices...")

    // Function to handle voices loaded
    const handleVoicesLoaded = () => {
      const voices = window.speechSynthesis.getVoices()
      if (voices.length > 0) {
        console.log("Voices loaded:", voices.length)
        setVoicesLoaded(true)
        setIsLoadingVoices(false)

        // Clear the timeout since voices loaded successfully
        if (voiceLoadTimeoutRef.current) {
          clearTimeout(voiceLoadTimeoutRef.current)
        }
      }
    }

    // Check if voices are already loaded
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      console.log("Voices already loaded:", voices.length)
      setVoicesLoaded(true)
      setIsLoadingVoices(false)
    } else {
      // Wait for voices to load with a timeout fallback
      window.speechSynthesis.addEventListener("voiceschanged", handleVoicesLoaded)

      // Set a timeout to stop waiting after 3 seconds
      voiceLoadTimeoutRef.current = setTimeout(() => {
        console.log("Voice loading timeout reached, using available voices")
        setIsLoadingVoices(false)
        // Even if we couldn't detect voices loaded event, we'll try to use whatever is available
        setVoicesLoaded(true)
      }, 3000)
    }

    return () => {
      if (speechSynthesisSupported) {
        window.speechSynthesis.removeEventListener("voiceschanged", handleVoicesLoaded)
      }
      if (voiceLoadTimeoutRef.current) {
        clearTimeout(voiceLoadTimeoutRef.current)
      }
    }
  }, [speechSynthesisSupported])

  // Clean up recognition on unmount
  useEffect(() => {
    return () => {
      cleanupRecognition()
    }
  }, [])

  // Function to create a new recognition instance
  const createRecognitionInstance = useCallback(() => {
    if (!speechRecognitionSupported) return null

    try {
      // Use the appropriate constructor
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()

      // Configure the recognition
      recognition.continuous = true
      recognition.interimResults = true

      // ALWAYS use en-US for best compatibility
      recognition.lang = "en-US"
      console.log(`Setting speech recognition locale to: en-US (fixed)`)

      return recognition
    } catch (error) {
      console.error("Failed to create speech recognition instance:", error)
      return null
    }
  }, [speechRecognitionSupported])

  // Clean up recognition
  const cleanupRecognition = useCallback(() => {
    console.log("Cleaning up recognition")

    // Clear any timeouts
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }

    // Stop recognition if it's active
    if (recognitionRef.current) {
      try {
        // Set the flag to inactive first
        isRecognitionActiveRef.current = false

        // Remove event handlers to prevent callbacks
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null

        // Stop the recognition
        recognitionRef.current.stop()
        console.log("Recognition stopped during cleanup")
      } catch (error) {
        console.log("Error stopping recognition during cleanup:", error)
      }
    }

    // Reset the recognition reference
    recognitionRef.current = null

    // Reset the start time
    startTimeRef.current = null

    // Reset the retry count
    setRetryCount(0)

    // Reset the error
    setRecognitionError(null)
  }, [])

  // Set up recognition event handlers
  const setupRecognitionHandlers = useCallback(() => {
    if (!recognitionRef.current) return

    // Result handler
    recognitionRef.current.onresult = (event: any) => {
      console.log("Speech recognition result received")
      const current = event.resultIndex
      const result = event.results[current]
      const transcriptText = result[0].transcript

      console.log("Transcript:", transcriptText)
      setTranscript(transcriptText)

      // Reset the timeout on new speech
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set a new timeout to submit after 2.5 seconds of silence
      timeoutRef.current = setTimeout(() => {
        if (transcriptText.trim()) {
          stopListening()
          onSpeechInput(transcriptText)
          setTranscript("")
        }
      }, 2500)
    }

    // Error handler
    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error", event.error, event)

      // Record the error
      setRecognitionError(event.error)

      // Calculate how long recognition was active
      const recognitionTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0

      if (event.error === "not-allowed") {
        toast({
          title: "Microphone access denied",
          description: "Please allow microphone access to use voice input.",
          variant: "destructive",
        })
        setIsListening(false)
        isRecognitionActiveRef.current = false
      } else if (event.error === "aborted") {
        // This is normal when stopping, don't do anything special
        console.log("Recognition aborted - this is normal when stopping")
      } else if (event.error === "no-speech") {
        console.log("No speech detected, continuing to listen...")
        // Don't stop listening on no-speech error
      } else if (recognitionTime < MIN_RECOGNITION_TIME && retryCount < MAX_RETRIES) {
        // If recognition failed quickly and we haven't exceeded max retries
        console.log(`Recognition failed quickly (${recognitionTime}ms), retrying...`)
        setRetryCount((prev) => prev + 1)

        // Try to restart after a delay
        setTimeout(() => {
          if (isListening) {
            startListening()
          }
        }, RETRY_DELAY)
      } else {
        console.log("Recognition error:", event.error)
        // For other errors or if we've exceeded retries, let onend handle it
      }
    }

    // End handler
    recognitionRef.current.onend = () => {
      console.log("Speech recognition ended")

      // Calculate how long recognition was active
      const recognitionTime = startTimeRef.current ? Date.now() - startTimeRef.current : 0

      // Only restart if we're still in listening mode and not manually stopped
      if (isListening && isRecognitionActiveRef.current) {
        // If recognition ended too quickly and we haven't exceeded max retries
        if (recognitionTime < MIN_RECOGNITION_TIME && retryCount < MAX_RETRIES) {
          console.log(`Recognition ended too quickly (${recognitionTime}ms), retrying...`)
          setRetryCount((prev) => prev + 1)

          // Try to restart after a delay
          setTimeout(() => {
            if (isListening && isRecognitionActiveRef.current) {
              try {
                startListening()
              } catch (error) {
                console.error("Failed to restart speech recognition", error)
                setIsListening(false)
                isRecognitionActiveRef.current = false
              }
            }
          }, RETRY_DELAY)
        } else if (retryCount >= MAX_RETRIES) {
          // If we've exceeded max retries, stop trying
          console.log(`Exceeded max retries (${MAX_RETRIES}), stopping recognition`)
          setIsListening(false)
          isRecognitionActiveRef.current = false

          toast({
            title: "Speech recognition failed",
            description: "Please try again or use text input instead.",
            variant: "destructive",
          })
        } else {
          // Normal restart
          console.log("Restarting speech recognition normally")

          // Add a small delay before restarting to avoid conflicts
          setTimeout(() => {
            if (isListening && isRecognitionActiveRef.current) {
              try {
                // Create a new instance to avoid potential issues
                recognitionRef.current = createRecognitionInstance()
                if (recognitionRef.current) {
                  setupRecognitionHandlers()
                  recognitionRef.current.start()
                  startTimeRef.current = Date.now()
                }
              } catch (error) {
                console.error("Failed to restart speech recognition", error)
                setIsListening(false)
                isRecognitionActiveRef.current = false
              }
            }
          }, 300)
        }
      } else {
        console.log(
          "Not restarting recognition (listening:",
          isListening,
          ", active:",
          isRecognitionActiveRef.current,
          ")",
        )
        setIsListening(false)
        isRecognitionActiveRef.current = false
      }
    }
  }, [createRecognitionInstance, isListening, onSpeechInput, retryCount, toast])

  // Handle text-to-speech
  useEffect(() => {
    if (!speechSynthesisSupported || isMuted || !textToSpeak || !voicesLoaded) return

    // Function to speak text
    const speakText = () => {
      try {
        setLoadingChunk(true)

        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        // Preprocess the text for better speech synthesis
        const processedText = preprocessTextForSpeech(textToSpeak)

        // Split text into manageable chunks if it's too long
        const textChunks = chunkTextForSpeech(processedText)

        // Get the best voice for the current language and gender preference
        const voice = getBestVoice(language, useFemaleVoice)

        // Speak each chunk
        let chunkIndex = 0

        const speakNextChunk = () => {
          if (chunkIndex >= textChunks.length) {
            setIsSpeaking(false)
            setLoadingChunk(false)
            return
          }

          setLoadingChunk(true)

          const chunk = textChunks[chunkIndex]
          const utterance = new SpeechSynthesisUtterance(chunk)
          utteranceRef.current = utterance

          // Set language based on the app's current language
          utterance.lang = mapLanguageToLocale(language)

          if (voice) {
            utterance.voice = voice
          }

          utterance.onstart = () => {
            setLoadingChunk(false)
            setIsSpeaking(true)
          }

          utterance.onend = () => {
            chunkIndex++
            speakNextChunk()
          }

          utterance.onerror = (event) => {
            console.error("Speech synthesis error", event)
            setLoadingChunk(false)

            // Try with default voice if specific voice failed
            if (utterance.voice && chunkIndex < textChunks.length) {
              console.log("Retrying chunk with default voice")
              const newUtterance = new SpeechSynthesisUtterance(textChunks[chunkIndex])
              newUtterance.lang = mapLanguageToLocale(language)
              newUtterance.onend = () => {
                chunkIndex++
                speakNextChunk()
              }
              window.speechSynthesis.speak(newUtterance)
            } else {
              setIsSpeaking(false)
            }
          }

          window.speechSynthesis.speak(utterance)
        }

        // Start speaking the first chunk
        speakNextChunk()
      } catch (error) {
        console.error("Error in speech synthesis", error)
        setIsSpeaking(false)
        setLoadingChunk(false)
      }
    }

    // Small delay to ensure everything is ready
    const timeoutId = setTimeout(speakText, 100)

    return () => {
      clearTimeout(timeoutId)
      if (speechSynthesisSupported) {
        window.speechSynthesis.cancel()
      }
      if (utteranceRef.current) {
        utteranceRef.current.onend = null
        utteranceRef.current.onerror = null
        utteranceRef.current.onstart = null
      }
      setLoadingChunk(false)
    }
  }, [textToSpeak, language, isMuted, useFemaleVoice, speechSynthesisSupported, voicesLoaded, setIsSpeaking])

  // Toggle speech recognition
  const toggleListening = () => {
    if (!speechRecognitionSupported) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser.",
        variant: "destructive",
      })
      return
    }

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  // Start listening function (exposed for external use)
  const startListening = useCallback(() => {
    if (!speechRecognitionSupported) return

    // If already listening, don't start again
    if (isListening || isRecognitionActiveRef.current) {
      console.log("Already listening, not starting again")
      return
    }

    try {
      // Clean up any existing recognition
      cleanupRecognition()

      // Clear any previous transcript
      setTranscript("")

      // Create a new recognition instance
      recognitionRef.current = createRecognitionInstance()

      if (!recognitionRef.current) {
        throw new Error("Failed to create recognition instance")
      }

      // Set up event handlers
      setupRecognitionHandlers()

      // Mark as active before starting to avoid race conditions
      isRecognitionActiveRef.current = true
      setIsListening(true)

      // Start recognition
      recognitionRef.current.start()
      startTimeRef.current = Date.now()

      console.log("Speech recognition started successfully")
    } catch (error) {
      console.error("Failed to start speech recognition", error)

      // Reset state on error
      setIsListening(false)
      isRecognitionActiveRef.current = false

      toast({
        title: "Error",
        description: "Failed to start speech recognition. Please try again.",
        variant: "destructive",
      })
    }
  }, [
    cleanupRecognition,
    createRecognitionInstance,
    isListening,
    setupRecognitionHandlers,
    speechRecognitionSupported,
    toast,
  ])

  // Stop listening function (exposed for external use)
  const stopListening = useCallback(() => {
    if (!speechRecognitionSupported) return

    console.log("Stopping speech recognition")

    // Mark as inactive before stopping to prevent auto-restart
    isRecognitionActiveRef.current = false
    setIsListening(false)

    if (recognitionRef.current) {
      try {
        // Remove event handlers to prevent callbacks
        const originalHandlers = {
          onresult: recognitionRef.current.onresult,
          onerror: recognitionRef.current.onerror,
          onend: recognitionRef.current.onend,
        }

        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null

        // Stop recognition
        recognitionRef.current.stop()
        console.log("Speech recognition stopped")

        // Clean up completely after a delay
        setTimeout(() => {
          cleanupRecognition()
        }, 500)
      } catch (error) {
        console.error("Error stopping speech recognition", error)
        cleanupRecognition()
      }
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [cleanupRecognition, speechRecognitionSupported])

  // Toggle mute for text-to-speech
  const toggleMute = () => {
    if (!speechSynthesisSupported) {
      toast({
        title: "Not supported",
        description: "Speech synthesis is not supported in your browser.",
        variant: "destructive",
      })
      return
    }

    if (!isMuted) {
      try {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      } catch (error) {
        console.error("Error canceling speech synthesis", error)
      }
    }
    setIsMuted(!isMuted)
  }

  // Toggle voice gender
  const toggleVoiceGender = () => {
    // If currently speaking, cancel it as we'll change the voice
    if (isSpeaking) {
      try {
        window.speechSynthesis.cancel()
        setIsSpeaking(false)
      } catch (error) {
        console.error("Error canceling speech synthesis", error)
      }
    }

    setUseFemaleVoice(!useFemaleVoice)

    // Show a toast to confirm the change
    toast({
      title: `Using ${!useFemaleVoice ? "female" : "male"} voice`,
      description: `Switched to ${!useFemaleVoice ? "female" : "male"} voice for text-to-speech.`,
    })
  }

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Voice chat toggle button */}
        {onVoiceChatToggle && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full border-primary/20 bg-primary/5"
                onClick={onVoiceChatToggle}
              >
                <MessageSquare className="h-4 w-4 text-primary" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open voice chat mode</TooltipContent>
          </Tooltip>
        )}

        {/* Voice gender toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full transition-all duration-300 ${
                useFemaleVoice
                  ? "border-pink-300 bg-pink-50 dark:bg-pink-900/20"
                  : "border-blue-300 bg-blue-50 dark:bg-blue-900/20"
              }`}
              onClick={toggleVoiceGender}
              disabled={isLoadingVoices}
            >
              {isLoadingVoices ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : useFemaleVoice ? (
                <UserRound className="h-4 w-4 text-pink-500 dark:text-pink-300" />
              ) : (
                <User className="h-4 w-4 text-blue-500 dark:text-blue-300" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLoadingVoices
              ? "Loading voices..."
              : useFemaleVoice
                ? "Female voice (click to switch to male)"
                : "Male voice (click to switch to female)"}
          </TooltipContent>
        </Tooltip>

        {/* Mute/unmute button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full ${isMuted ? "bg-muted" : ""}`}
              onClick={toggleMute}
              disabled={!speechSynthesisSupported || isLoadingVoices}
            >
              {isLoadingVoices ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isMuted ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <div className="relative">
                  <Volume2 className={`h-4 w-4 ${isSpeaking ? "text-primary" : ""}`} />
                  {isSpeaking && (
                    <div className="absolute -top-1 -right-1">
                      <div className="relative">
                        <div className="absolute -top-2 -left-2">
                          <AudioWaveAnimation isActive={isSpeaking} isListening={false} className="scale-75" />
                        </div>
                      </div>
                    </div>
                  )}
                  {loadingChunk && (
                    <div className="absolute -top-1 -right-1 w-2 h-2">
                      <motion.div
                        className="w-2 h-2 bg-primary rounded-full"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
                      />
                    </div>
                  )}
                </div>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isLoadingVoices
              ? "Loading speech capabilities..."
              : isMuted
                ? "Unmute"
                : isSpeaking
                  ? "Speaking (click to stop)"
                  : "Click to speak the response"}
          </TooltipContent>
        </Tooltip>

        {/* Microphone button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className={`rounded-full ${
                isListening ? "bg-accent text-accent-foreground border-accent animate-pulse" : ""
              }`}
              onClick={toggleListening}
              disabled={!speechRecognitionSupported}
            >
              {isListening ? (
                <div className="relative">
                  <Mic className="h-4 w-4" />
                  <div className="absolute -top-1 -right-1">
                    <div className="relative">
                      <div className="absolute -top-2 -left-2">
                        <AudioWaveAnimation isActive={true} isListening={true} className="scale-75" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <MicOff className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isListening ? "Listening to your voice (click to stop)" : "Click to speak your question"}
          </TooltipContent>
        </Tooltip>

        {/* Transcript display with countdown indicator */}
        {isListening && (
          <div className="relative ml-2 py-1 px-2 bg-background/50 backdrop-blur-sm rounded-md border border-accent/20">
            <motion.div
              className="absolute bottom-0 left-0 h-[2px] bg-accent"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3, ease: "linear", repeat: transcript ? 1 : 0 }}
            />
            {transcript ? (
              <p className="text-sm text-foreground max-w-[200px] truncate">"{transcript}"</p>
            ) : (
              <p className="text-sm text-muted-foreground">Speak your question...</p>
            )}
          </div>
        )}

        {/* Error indicator */}
        {recognitionError && retryCount > 0 && (
          <div className="text-xs text-accent ml-2">
            Retrying... ({retryCount}/{MAX_RETRIES})
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}

