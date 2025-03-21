"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Bug, X } from "lucide-react"

export default function SpeechDebug() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [supportInfo, setSupportInfo] = useState<Record<string, boolean | string>>({})

  useEffect(() => {
    if (isOpen) {
      // Check browser support
      const speechRecognitionSupported =
        typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)

      const speechSynthesisSupported = typeof window !== "undefined" && "speechSynthesis" in window

      // Get browser info
      const browserInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
      }

      // Check available voices
      let voicesInfo = "No voices available"
      if (speechSynthesisSupported) {
        const voices = window.speechSynthesis.getVoices()
        voicesInfo = voices.length > 0 ? `${voices.length} voices available` : "No voices loaded yet"
      }

      setSupportInfo({
        speechRecognitionSupported,
        speechSynthesisSupported,
        browser: browserInfo.userAgent,
        platform: browserInfo.platform,
        language: browserInfo.language,
        voices: voicesInfo,
      })

      // Override console.log for speech-related logs
      const originalLog = console.log
      const originalError = console.error

      console.log = (...args) => {
        originalLog(...args)
        const message = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")

        if (
          message.toLowerCase().includes("speech") ||
          message.toLowerCase().includes("voice") ||
          message.toLowerCase().includes("recognition") ||
          message.toLowerCase().includes("transcript")
        ) {
          setLogs((prev) => [...prev.slice(-19), `LOG: ${message}`])
        }
      }

      console.error = (...args) => {
        originalError(...args)
        const message = args.map((arg) => (typeof arg === "object" ? JSON.stringify(arg) : String(arg))).join(" ")

        if (
          message.toLowerCase().includes("speech") ||
          message.toLowerCase().includes("voice") ||
          message.toLowerCase().includes("recognition")
        ) {
          setLogs((prev) => [...prev.slice(-19), `ERROR: ${message}`])
        }
      }

      return () => {
        console.log = originalLog
        console.error = originalError
      }
    }
  }, [isOpen])

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full opacity-50 hover:opacity-100"
        onClick={() => setIsOpen(true)}
      >
        <Bug className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-h-96 bg-background border border-border rounded-lg shadow-lg overflow-hidden">
      <div className="flex items-center justify-between p-2 border-b border-border bg-muted">
        <h3 className="text-sm font-medium">Speech Debug</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="p-2 border-b border-border bg-muted/50">
        <h4 className="text-xs font-medium mb-1">Support Info:</h4>
        <div className="text-xs space-y-1">
          {Object.entries(supportInfo).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium">{key}:</span> {String(value)}
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto max-h-64 p-2">
        <h4 className="text-xs font-medium mb-1">Logs:</h4>
        {logs.length === 0 ? (
          <div className="text-xs text-muted-foreground">No speech logs yet</div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, i) => (
              <div
                key={i}
                className={`text-xs p-1 rounded ${
                  log.startsWith("ERROR")
                    ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
                    : "bg-blue-50 dark:bg-blue-900/10"
                }`}
              >
                {log}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-border flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setLogs([])}>
          Clear Logs
        </Button>
      </div>
    </div>
  )
}

