'use client'

import type React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, MessageSquare, User, AlertCircle, LightbulbIcon, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { Language, Question } from './types'
import { getQuestions, saveQuestion } from './actions'
import { useTheme } from 'next-themes'
import { LANGUAGE_SPECIFIC_SUGGESTIONS, LANGUAGE_NAMES } from './constants'
import HealthHeader from './components/health-header'
import HealthAIIcon from './components/health-ai-icon' // kept for possible other uses (not used now)
import { getFallbackResponse } from './utils/fallback-response'
import MedicalDisclaimer from './components/medical-disclaimer'
import VoiceControls from './components/voice-controls'
// Voice chat dialog, tooltip, and debug removed (keeping only microphone STT)
import Image from 'next/image'

export default function HomeScreen() {
  const [language, setLanguage] = useState<Language>('en') // Fixed to English only
  const [messages, setMessages] = useState<Question[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState('')
  const [streamingSuggestions, setStreamingSuggestions] = useState<string[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const { toast } = useToast()
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const { theme } = useTheme()
  const [currentStreamingId, setCurrentStreamingId] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const maxRetries = 3
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [defaultSuggestions, setDefaultSuggestions] = useState<string[]>(
    LANGUAGE_SPECIFIC_SUGGESTIONS.en
  )
  const inputRef = useRef<HTMLInputElement>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const eventSourceRef = useRef<EventSource | null>(null)

  // Voice chat state
  // Removed voice chat modal state
  const [isListening, setIsListening] = useState(false)
  // Removed speaking state (TTS)
  const [transcript, setTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('')

  // Update default suggestions when language changes (still present for future flexibility)
  useEffect(() => {
    setDefaultSuggestions(LANGUAGE_SPECIFIC_SUGGESTIONS[language])
  }, [language])

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: 'smooth',
      })
    }
  }, [])

  // Extra client-side English enforcement safeguard (lighter since API is clean)
  const enforceEnglish = useCallback((text: string): string => {
    if (!text) return ''
    // Since API output is clean, just do minimal cleanup
    return text
      .replace(/\u00A0/g, ' ') // non-breaking spaces to normal
      .replace(/[ ]{3,}/g, '  ') // collapse only excessive spaces (3+)
      .replace(/\n{4,}/g, '\n\n\n') // limit very excessive blank lines
      .trim()
  }, [])

  // Robust parser for ANSWER / SUGGESTED_QUESTIONS sections (tolerant to stream fragments)
  const parseResponseClient = useCallback((raw: string) => {
    if (!raw) return { answer: '', suggestions: [] as string[] }
    const answerMatch = raw.match(/ANSWER:([\s\S]*?)(SUGGESTED_QUESTIONS:|$)/)
    let answer = ''
    if (answerMatch) answer = answerMatch[1].trim()
    const suggestionsBlockMatch = raw.match(/SUGGESTED_QUESTIONS:([\s\S]*)/)
    let suggestions: string[] = []
    if (suggestionsBlockMatch) {
      const block = suggestionsBlockMatch[1]
      // Better parsing: split only on numbered list patterns, not on every newline
      suggestions = block
        .split(/(?:\n|^)\s*\d+\.\s*/m) // Split on "1. ", "2. " etc at start of line
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.match(/^\d+$/)) // Remove empty and standalone numbers
        .slice(0, 3)
    }
    return { answer, suggestions }
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent | string) => {
      scrollToBottom()
      if (typeof e !== 'string') e.preventDefault()
      const questionText = typeof e === 'string' ? e : input
      if (!questionText.trim()) return

      // Cancel any ongoing request
      if (abortControllerRef.current) abortControllerRef.current.abort()
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      setIsLoading(true)
      setIsStreaming(true)
      setShowSuggestions(false)
      setStreamingResponse('')
      setStreamingSuggestions([])
      setInput('')
      setRetryCount(0)
      setIsSidebarOpen(false)

      const tempId = Date.now().toString()
      const userMessage: Question = {
        id: tempId,
        text: questionText,
        language,
        response: '',
        suggestedQuestions: [],
        createdAt: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, userMessage])
      setCurrentStreamingId(tempId)
      let fullResponse = ''

      try {
        const makeApiRequest = async (currentRetry = 0): Promise<void> => {
          try {
            abortControllerRef.current = new AbortController()
            const signal = abortControllerRef.current.signal
            const backoffDelay = currentRetry === 0 ? 0 : Math.min(1000 * 2 ** (currentRetry - 1), 10000)
            if (backoffDelay) await new Promise((r) => setTimeout(r, backoffDelay))

            const timeoutId = setTimeout(() => {
              if (eventSourceRef.current) eventSourceRef.current.close()
              if (abortControllerRef.current) abortControllerRef.current.abort()
            }, 45000)

            const response = await fetch('/api/chat', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ question: questionText, language: 'en' }),
              signal,
            })
            if (!response.ok) throw new Error(await response.text())
            const reader = response.body?.getReader()
            if (!reader) throw new Error('Failed to get response reader')
            let receivedData = false
            try {
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                receivedData = true
                const textChunk = new TextDecoder().decode(value)
                const lines = textChunk.split('\n\n')
                for (const line of lines) {
                  if (!line.trim() || !line.startsWith('data: ')) continue
                  try {
                    const data = JSON.parse(line.substring(6))
                    if (data.type === 'chunk' && data.content) {
                      fullResponse += data.content
                      const { answer, suggestions } = parseResponseClient(fullResponse)
                      setStreamingResponse(enforceEnglish(answer || fullResponse))
                      if (suggestions.length) setStreamingSuggestions(suggestions.map(enforceEnglish))
                      scrollToBottom()
                    }
                  } catch {}
                }
              }
            } finally {
              clearTimeout(timeoutId)
            }
            if (!receivedData) throw new Error('No data received from API')
          } catch (apiError: any) {
            if (apiError?.name === 'AbortError' && currentRetry < maxRetries) {
              setRetryCount(currentRetry + 1)
              return makeApiRequest(currentRetry + 1)
            }
            if (currentRetry < maxRetries) {
              setRetryCount(currentRetry + 1)
              return makeApiRequest(currentRetry + 1)
            }
            // Only use fallback if all retries exhausted
            fullResponse = getFallbackResponse('en', questionText)
            const { answer, suggestions } = parseResponseClient(fullResponse)
            setStreamingResponse(enforceEnglish(answer || fullResponse))
            if (suggestions.length) setStreamingSuggestions(suggestions.map(enforceEnglish))
          }
        }
        await makeApiRequest()

        // Final parse & commit to message list
        const { answer: finalParsedAnswer, suggestions: finalParsedSuggestions } = parseResponseClient(fullResponse)
        const finalAnswer = enforceEnglish(finalParsedAnswer || fullResponse)
        const finalSuggestions = finalParsedSuggestions.map(enforceEnglish)
        setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, response: finalAnswer, suggestedQuestions: finalSuggestions } : m)))
        setLastResponse(finalAnswer)
        setCurrentStreamingId(null)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        toast({ title: 'Error', description: 'Failed to submit question. Please try again.', variant: 'destructive' })
        setCurrentStreamingId(null)
      } finally {
        setIsLoading(false)
        setIsStreaming(false)
        abortControllerRef.current = null
        setTimeout(() => inputRef.current?.focus(), 100)
      }
    },
    [input, language, scrollToBottom, maxRetries, toast, parseResponseClient, enforceEnglish]
  )
  // end handleSubmit

  // Enhanced formatter: detects bullet lists, splits long blocks into sentence groups for readability
  const renderFormatted = useCallback((text: string) => {
    if (!text) return null
    const cleaned = text.trim()
    if (!cleaned) return null

    // First split on double newlines to respect intentional paragraph breaks
    const rawParas = cleaned.split(/\n{2,}/)
    const nodes: React.ReactNode[] = []

    const sentenceChunk = (para: string) => {
      // If single very long paragraph, split into sentence groups of up to ~2 sentences
      const sentences = para
        .replace(/\n/g, ' ')
        .split(/(?<=[.!?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
      if (sentences.length <= 2) return [para]
      const groups: string[] = []
      for (let i = 0; i < sentences.length; i += 2) {
        groups.push(sentences.slice(i, i + 2).join(' '))
      }
      return groups
    }

    rawParas.forEach((para, pIdx) => {
      // Detect pure bullet list
      const lines = para.split(/\n/)
      const bulletPattern = /^\s*([*-]|\d+\.)\s+/
      const isBulletBlock = lines.every((l) => bulletPattern.test(l)) && lines.length > 1
      if (isBulletBlock) {
        nodes.push(
          <ul key={`list-${pIdx}`} className="list-disc ml-5 space-y-1 mb-4">
            {lines.map((l, i) => (
              <li key={i}>{l.replace(bulletPattern, '')}</li>
            ))}
          </ul>
        )
        return
      }

      // Mixed content: try to identify inline bullets like "1. Item" inside
      if (/SUGGESTED_QUESTIONS:/i.test(para)) {
        // Skip raw marker if present; suggestions handled separately
        return
      }

      const groups = sentenceChunk(para)
      groups.forEach((g, gi) =>
        nodes.push(
          <p key={`p-${pIdx}-${gi}`} className="mb-3 last:mb-0 leading-relaxed text-foreground">
            {g}
          </p>
        )
      )
    })

    return nodes
  }, [])


  useEffect(() => {
  // Anonymous mode: skip server fetch to ensure no cross-user data exposure
  setMessages([])
  setLastResponse('')
  setTimeout(scrollToBottom, 100)

    // Clean up any pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
      }
    }
  }, [toast, scrollToBottom])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  // Removed toggleVoiceChat (voice chat disabled)

  return (
    <div className="flex flex-col h-screen bg-health-bg dark:bg-health-bg-dark">
      {showDisclaimer && <MedicalDisclaimer onAccept={() => setShowDisclaimer(false)} />}

      <HealthHeader
        language={language}
        setLanguage={setLanguage}
        languages={LANGUAGE_NAMES}
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
      />

      <div className="flex flex-1  overflow-hidden">
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={toggleSidebar} />
        )}

        {/* Sidebar */}
        <motion.div
          className={`fixed md:relative z-50 h-full bg-background border-r border-border shadow-lg md:shadow-none overflow-hidden ${
            isSidebarOpen ? 'w-72' : 'w-0 md:w-72'
          }`}
          initial={false}
          animate={{ width: isSidebarOpen ? '18rem' : '0rem' }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="h-full flex flex-col p-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-primary">Chat History</h2>
              <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleSidebar}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto scrollbar-hide">
              <div className="space-y-2">
                {messages.length > 0 ? (
                  messages.map((message) => (
                    <motion.button
                      key={message.id}
                      onClick={() => {
                        chatContainerRef.current
                          ?.querySelector(`[data-message-id="${message.id}"]`)
                          ?.scrollIntoView({
                            behavior: 'smooth',
                          })
                        setIsSidebarOpen(false)
                      }}
                      className="w-full text-left p-3 rounded-xl hover:bg-primary/5 text-foreground text-sm truncate flex items-center gap-2 transition-all duration-300 border border-transparent hover:border-primary/20"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <MessageSquare className="w-4 h-4 shrink-0 text-primary" />
                      <span className="truncate">{message.text}</span>
                    </motion.button>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No conversations yet</p>
                    <p className="text-xs mt-2">Start by asking a question about prenatal health</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main Content */}
        <div className="flex-1  flex flex-col h-full overflow-hidden">
          <main className="flex-1  relative overflow-hidden">
            <div
              ref={chatContainerRef}
              className="h-full overflow-y-auto  pb-24 px-4 md:px-8 scrollbar-hide"
            >
              <div className="max-w-3xl mx-auto space-y-6 py-6">
                <AnimatePresence>
                  {messages.map((message) => (
                    <motion.div
                      key={message.id}
                      data-message-id={message.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.25 }}
                      className="space-y-4"
                    >
                        {/* User Message */}
                        <motion.div whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
                          <div className="w-full bg-muted/40 dark:bg-slate-800/40 border border-border rounded-xl p-4 shadow-sm">
                            <div className="flex items-center mb-2 gap-2">
                              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-foreground" />
                              </div>
                              <span className="text-xs font-semibold text-foreground/80 uppercase tracking-wide">You</span>
                            </div>
                            <div className="text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">{message.text}</div>
                          </div>
                        </motion.div>

                        {/* AI Assistant Message */}
                        {message.id !== currentStreamingId && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
                            <div className="w-full bg-background border border-border rounded-xl p-5 shadow-sm leading-relaxed">
                              <div className="flex items-center mb-3 gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                  <Image src="/logo.png" alt="Assistant" width={28} height={28} className="object-contain" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prenatal Health Assistant</span>
                              </div>
                              <div className="text-sm text-foreground space-y-1">
                                {renderFormatted(message.response)}
                              </div>
                              {message.suggestedQuestions?.length > 0 && (
                                <div className="mt-5 pt-4 border-t border-border/60">
                                  <h3 className="text-xs font-semibold text-primary flex items-center gap-1 mb-2 tracking-wide uppercase">
                                    <LightbulbIcon className="w-3.5 h-3.5" /> Suggested Questions
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {message.suggestedQuestions.map((q, idx) => (
                                      <Button key={idx} variant="outline" size="sm" className="text-xs h-auto py-1 px-2 rounded-lg border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary" onClick={() => handleSubmit(q)}>
                                        {q}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}

                        {/* Streaming Response (if this is the current streaming message) */}
                        {message.id === currentStreamingId && (
                          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                            <div className="w-full bg-background border border-border rounded-xl p-5 shadow-sm leading-relaxed">
                              <div className="flex items-center mb-3 gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                                  <Image src="/logo.png" alt="Assistant" width={28} height={28} className="object-contain animate-pulse" />
                                </div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prenatal Health Assistant</span>
                              </div>
                              <div>
                                {retryCount > 0 && (
                                  <div className="mb-2 text-accent flex items-center gap-1 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>
                                      Retrying... ({retryCount}/{maxRetries})
                                    </span>
                                  </div>
                                )}
                                {streamingResponse ? (
                                  <div className="break-words text-foreground whitespace-pre-wrap leading-relaxed space-y-1">
                                    {renderFormatted(streamingResponse)}
                                    <motion.span
                                      className="inline-block"
                                      animate={{ opacity: [0, 1, 0] }}
                                      transition={{ repeat: Number.POSITIVE_INFINITY, duration: 1.5 }}
                                    >
                                      ▌
                                    </motion.span>
                                  </div>
                                ) : (
                                  <div className="flex gap-1 py-2">
                                    <motion.div
                                      className="w-2 h-2 bg-primary rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{
                                        repeat: Number.POSITIVE_INFINITY,
                                        duration: 1,
                                        delay: 0,
                                      }}
                                    />
                                    <motion.div
                                      className="w-2 h-2 bg-primary rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{
                                        repeat: Number.POSITIVE_INFINITY,
                                        duration: 1,
                                        delay: 0.2,
                                      }}
                                    />
                                    <motion.div
                                      className="w-2 h-2 bg-primary rounded-full"
                                      animate={{ scale: [1, 1.2, 1] }}
                                      transition={{
                                        repeat: Number.POSITIVE_INFINITY,
                                        duration: 1,
                                        delay: 0.4,
                                      }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Streaming Suggestions */}
                {streamingSuggestions.length > 0 && (
                                <motion.div
                  className="mt-5 pt-4 border-t border-border/60 flex flex-wrap gap-2"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  <div className="mt-2 w-full">
                                    <h3 className="text-sm font-medium text-primary flex items-center">
                                      <LightbulbIcon className="w-4 h-4 mr-2" />
                                      Suggested Questions
                                    </h3>
                                  </div>
                                  <div className="flex flex-wrap gap-2 max-w-full">
                                    {streamingSuggestions.map((question, idx) => (
                                      <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.3, delay: idx * 0.1 }}
                                        whileHover={{ scale: 1.03 }}
                                        whileTap={{ scale: 0.97 }}
                                      >
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            scrollToBottom()
                                            handleSubmit(question)
                                          }}
                                          className="text-wrap h-auto text-left p-2 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary"
                                        >
                                          {question}
                                        </Button>
                                      </motion.div>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    ))}
                </AnimatePresence>

                {/* Welcome Message and Default Suggestions */}
                {showSuggestions && messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="flex flex-col items-center justify-center py-12 text-center"
                  >
                    <div className="mb-6">
                      <Image alt="" src="/logo.png" width={120} height={120} />
                    </div>
                    <h1 className="text-2xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
                      Prenatal Health Assistant
                    </h1>
                    <p className="text-muted-foreground mb-8 max-w-md">
                      Ask any questions about prenatal care, pregnancy, childbirth, or postnatal
                      care in your preferred language.
                    </p>

                    <div className="w-full max-w-md">
                      <h3 className="text-sm font-medium text-primary mb-3 flex items-center justify-center">
                        <LightbulbIcon className="w-4 h-4 mr-2" />
                        Suggested Questions
                      </h3>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {defaultSuggestions.map((suggestion, idx) => (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => {
                                handleSubmit(suggestion)
                                scrollToBottom()
                              }}
                              className="text-wrap rounded-xl"
                            >
                              {suggestion}
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Voice chat dialog & tooltip removed */}
            <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t border-border">
              <div className="p-4 max-w-3xl mx-auto">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <VoiceControls
                        onSpeechInput={(text) => {
                          setInput(text)
                          handleSubmit(text)
                        }}
                        language={language}
                        isListeningState={[isListening, setIsListening]}
                        transcriptState={[transcript, setTranscript]}
                      />

                      {/* Voice interaction status display */}
                      {isStreaming ? (
                        <span className="text-xs text-accent animate-pulse ml-2">
                          AI is responding...
                        </span>
                      ) : null}
                    </div>
                    <div className="flex-grow"></div>
                    {isStreaming && (
                      <span className="text-xs text-muted-foreground animate-pulse">
                        AI is responding...
                      </span>
                    )}
                  </div>
                  <form onSubmit={handleSubmit} className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about prenatal health..."
                      className="flex-1 rounded-full border-primary/20 focus-visible:ring-primary"
                      disabled={isLoading || isStreaming}
                    />
                    <Button
                      type="submit"
                      disabled={isLoading || isStreaming || !input.trim()}
                      className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
  {/* SpeechDebug removed */}
    </div>
  )
}
