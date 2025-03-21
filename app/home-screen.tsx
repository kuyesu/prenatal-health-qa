'use client'

import type React from 'react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Send, MessageSquare, User, AlertCircle, LightbulbIcon, X, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import type { Language, Question } from './types'
import { getQuestions, saveQuestion } from './actions'
import { useTheme } from 'next-themes'
import { LANGUAGE_SPECIFIC_SUGGESTIONS, LANGUAGE_NAMES, TEST_MODE_RESPONSES } from './constants'
import HealthHeader from './components/health-header'
import HealthAIIcon from './components/health-ai-icon'
import { getFallbackResponse } from './utils/fallback-response'
import MedicalDisclaimer from './components/medical-disclaimer'
import VoiceControls from './components/voice-controls'
import VoiceTooltip from './components/voice-tooltip'
import VoiceChatDialog from './components/voice-chat-dialog'
import SpeechDebug from './components/speech-debug'
import Image from 'next/image'

export default function HomeScreen() {
  const [language, setLanguage] = useState<Language>('en')
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
  const [useTestMode, setUseTestMode] = useState(false)
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
  const [textToSpeak, setTextToSpeak] = useState<{ text: string; id: number }>({ text: '', id: 0 })

  // Voice chat state
  const [isVoiceChatOpen, setIsVoiceChatOpen] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [lastResponse, setLastResponse] = useState('')

  // Update default suggestions when language changes
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

  const handleSubmit = useCallback(
    async (e: React.FormEvent | string) => {
      scrollToBottom()
      if (typeof e !== 'string') {
        e.preventDefault()
      }
      const questionText = typeof e === 'string' ? e : input
      if (!questionText.trim()) return

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Close any existing EventSource
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }

      try {
        setIsLoading(true)
        setIsStreaming(true)
        setShowSuggestions(false)
        setStreamingResponse('')
        setStreamingSuggestions([])
        setInput('')
        setRetryCount(0)
        setIsSidebarOpen(false)

        // Add user message immediately
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

        if (useTestMode) {
          // Test mode - simulate streaming with a fallback response
          console.log('Using test mode with fallback response')

          // Get the appropriate language response
          const fallbackResponse = TEST_MODE_RESPONSES[language] || TEST_MODE_RESPONSES.en

          // Simulate streaming by adding characters one by one
          const chars = fallbackResponse.split('')
          for (let i = 0; i < chars.length; i++) {
            await new Promise((resolve) => setTimeout(resolve, 10))
            fullResponse += chars[i]

            // Parse the response to extract answer and suggested questions
            const answerMatch = fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)
            const suggestionsMatch = fullResponse.match(/SUGGESTED_QUESTIONS:(.*)/s)

            if (answerMatch && answerMatch[1]) {
              setStreamingResponse(answerMatch[1].trim())
            } else {
              setStreamingResponse(fullResponse)
            }

            if (suggestionsMatch && suggestionsMatch[1]) {
              const suggestions = suggestionsMatch[1]
                .split(/\d+\./)
                .filter((q) => q.trim() !== '')
                .map((q) => q.trim())
                .slice(0, 3)

              setStreamingSuggestions(suggestions)
            }

            scrollToBottom()
          }
        } else {
          // Real API mode
          console.log('Fetching from API:', { question: questionText, language })

          const makeApiRequest = async (currentRetry = 0) => {
            try {
              // Create a new AbortController for this request
              abortControllerRef.current = new AbortController()
              const signal = abortControllerRef.current.signal

              // Calculate exponential backoff delay
              const backoffDelay =
                currentRetry === 0 ? 0 : Math.min(1000 * Math.pow(2, currentRetry - 1), 10000)
              if (backoffDelay > 0) {
                console.log(`Waiting ${backoffDelay}ms before retry ${currentRetry}...`)
                await new Promise((resolve) => setTimeout(resolve, backoffDelay))
              }

              console.log(
                `Attempt ${currentRetry + 1}/${maxRetries + 1}: Sending request to API...`
              )

              // Set up a timeout for the entire request
              const timeoutId = setTimeout(() => {
                console.log('Request timeout - aborting after 45 seconds')
                if (eventSourceRef.current) {
                  eventSourceRef.current.close()
                  eventSourceRef.current = null
                }
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort()
                }
              }, 45000) // 45 second timeout

              // First, make a POST request to initiate the streaming
              const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  question: questionText,
                  language,
                }),
                signal,
              })

              if (!response.ok) {
                const errorText = await response.text()
                console.error('API error response:', errorText)
                throw new Error(`API responded with status ${response.status}: ${errorText}`)
              }

              // Set up a reader for the stream
              const reader = response.body?.getReader()
              if (!reader) {
                throw new Error('Failed to get response reader')
              }

              // Process the stream
              let receivedData = false

              try {
                while (true) {
                  const { done, value } = await reader.read()

                  if (done) {
                    console.log('Stream complete')
                    break
                  }

                  receivedData = true

                  // Decode the chunk
                  const text = new TextDecoder().decode(value)
                  const lines = text.split('\n\n')

                  for (const line of lines) {
                    if (!line.trim() || !line.startsWith('data: ')) continue

                    try {
                      const jsonStr = line.substring(6) // Remove 'data: ' prefix
                      const data = JSON.parse(jsonStr)

                      if (data.error) {
                        console.error('Error from stream:', data.message)
                        throw new Error(data.message || 'Unknown stream error')
                      }

                      if (data.type === 'chunk' && data.content) {
                        fullResponse += data.content

                        // Parse the accumulated response
                        const answerMatch = fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)
                        const suggestionsMatch = fullResponse.match(/SUGGESTED_QUESTIONS:(.*)/s)

                        if (answerMatch && answerMatch[1]) {
                          const answerText = answerMatch[1].trim()
                          setStreamingResponse(answerText)
                          // Don't set text to speak during streaming to avoid interruptions
                        } else {
                          setStreamingResponse(fullResponse)
                        }

                        if (suggestionsMatch && suggestionsMatch[1]) {
                          const suggestions = suggestionsMatch[1]
                            .split(/\d+\./)
                            .filter((q) => q.trim() !== '')
                            .map((q) => q.trim())
                            .slice(0, 3)

                          setStreamingSuggestions(suggestions)
                        }

                        scrollToBottom()
                      }

                      if (data.type === 'done') {
                        console.log('Stream marked as done')
                        break
                      }
                    } catch (parseError) {
                      console.error('Error parsing SSE data:', parseError, 'Line:', line)
                    }
                  }
                }
              } catch (streamError) {
                console.error('Error processing stream:', streamError)
                throw streamError
              } finally {
                clearTimeout(timeoutId)
              }

              if (!receivedData) {
                throw new Error('No data received from the API')
              }
            } catch (apiError) {
              console.error('API fetch error:', apiError)

              // Check if this was an abort error (user cancelled or timeout)
              if (apiError.name === 'AbortError') {
                console.log('Request was aborted')

                // If it was a timeout (not user-initiated), retry
                if (currentRetry < maxRetries) {
                  console.log(
                    `Retrying request after timeout (${currentRetry + 1}/${maxRetries})...`
                  )
                  setRetryCount(currentRetry + 1)
                  return makeApiRequest(currentRetry + 1)
                } else {
                  console.log('Max retries reached after timeouts')
                  throw new Error('Request timed out repeatedly. Please try again later.')
                }
              }

              // Network errors should be retried
              if (
                apiError.message.includes('Failed to fetch') ||
                apiError.message.includes('NetworkError') ||
                apiError.message.includes('network') ||
                apiError.message.includes('ECONNREFUSED') ||
                apiError.message.includes('ETIMEDOUT')
              ) {
                if (currentRetry < maxRetries) {
                  console.log(
                    `Retrying request after network error (${currentRetry + 1}/${maxRetries})...`
                  )
                  setRetryCount(currentRetry + 1)
                  return makeApiRequest(currentRetry + 1)
                }
              }

              // If we haven't exceeded max retries, try again for any error
              if (currentRetry < maxRetries) {
                console.log(`Retrying request (${currentRetry + 1}/${maxRetries})...`)
                setRetryCount(currentRetry + 1)
                return makeApiRequest(currentRetry + 1)
              }

              // If we've reached max retries, use fallback
              console.log('All retries failed. Using fallback response.')
              fullResponse = getFallbackResponse(language, questionText)
              setStreamingResponse(
                fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)?.[1].trim() || ''
              )
              setStreamingSuggestions(
                fullResponse
                  .match(/SUGGESTED_QUESTIONS:(.*)/s)?.[1]
                  .split(/\d+\./)
                  .filter((q) => q.trim() !== '')
                  .map((q) => q.trim())
                  .slice(0, 3) || []
              )
            }
          }

          await makeApiRequest()
        }

        // Parse the final response
        const answerMatch = fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)
        const suggestionsMatch = fullResponse.match(/SUGGESTED_QUESTIONS:(.*)/s)

        let answer = ''
        let suggestedQuestions: string[] = []

        if (answerMatch && answerMatch[1]) {
          answer = answerMatch[1].trim()
        } else {
          answer = fullResponse.trim()
        }

        if (suggestionsMatch && suggestionsMatch[1]) {
          suggestedQuestions = suggestionsMatch[1]
            .split(/\d+\./)
            .filter((q) => q.trim() !== '')
            .map((q) => q.trim())
            .slice(0, 3)
        }

        try {
          // Save the question and response to the database
          const savedQuestion = await saveQuestion(
            questionText,
            language,
            answer,
            suggestedQuestions
          )

          // Update the messages with the saved question
          setMessages((prev) => prev.map((msg) => (msg.id === tempId ? savedQuestion : msg)))

          // Set the text to speak after completion
          setTextToSpeak({ text: answer, id: Date.now() })

          // Store the last response for voice chat
          setLastResponse(answer)
        } catch (dbError) {
          console.error('Error saving to database:', dbError)
          // If database save fails, still update the UI with the response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    response: answer,
                    suggestedQuestions: suggestedQuestions,
                  }
                : msg
            )
          )

          // Set the text to speak after completion
          setTextToSpeak({ text: answer, id: Date.now() })

          // Store the last response for voice chat
          setLastResponse(answer)
        }

        setCurrentStreamingId(null)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to submit question. Please try again.',
          variant: 'destructive',
        })
        console.error('Error submitting question:', error)
        setCurrentStreamingId(null)
      } finally {
        setIsLoading(false)
        setIsStreaming(false)
        abortControllerRef.current = null

        // Focus the input field after submission
        setTimeout(() => {
          inputRef.current?.focus()
        }, 100)
      }
    },
    [input, language, toast, scrollToBottom, useTestMode, maxRetries]
  )

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const questions = await getQuestions()
        setMessages(questions)

        // Set the last response for voice chat if there are messages
        if (questions.length > 0) {
          setLastResponse(questions[questions.length - 1].response)
        }

        setTimeout(scrollToBottom, 100)
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to load chat history. Please try refreshing the page.',
          variant: 'destructive',
        })
      }
    }
    fetchQuestions()

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

  const toggleVoiceChat = useCallback(() => {
    setIsVoiceChatOpen((prev) => !prev)
  }, [])

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

            {/* Test Mode Toggle */}
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="test-mode"
                  checked={useTestMode}
                  onChange={(e) => setUseTestMode(e.target.checked)}
                  className="rounded text-primary focus:ring-primary"
                />
                <label htmlFor="test-mode" className="text-sm text-muted-foreground">
                  Test Mode (No API)
                </label>
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
                  {messages.map((message, index) => {
                    // Calculate opacity based on position (older messages fade out)
                    const totalMessages = messages.length
                    const position = index + 1
                    // More aggressive fading - older messages fade out more quickly
                    const fadeStart = totalMessages - 3 // Start fading after the 3 most recent messages
                    const opacity =
                      position < fadeStart
                        ? Math.max(0.3, 1 - (totalMessages - position) * 0.15) // Faster fade rate
                        : 1

                    return (
                      <motion.div
                        key={message.id}
                        data-message-id={message.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: opacity,
                          y: 0,
                          filter:
                            position < fadeStart
                              ? `blur(${(totalMessages - position) * 0.5}px)`
                              : 'blur(0px)',
                        }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-6"
                      >
                        {/* User Message */}
                        <motion.div
                          className="flex items-start gap-3 justify-end w-full"
                          whileHover={{ scale: 1.01 }}
                          transition={{ duration: 0.2 }}
                        >
                          <div className="flex-1 overflow-hidden">
                            <div className="user-message ml-auto max-w-[85%]">
                              <p className="break-words text-foreground">{message.text}</p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 justify-end">
                              <span className="text-xs text-muted-foreground">You</span>
                              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-3.5 h-3.5 text-primary" />
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        {/* AI Assistant Message */}
                        {message.id !== currentStreamingId && (
                          <motion.div
                            className="flex items-start gap-3 w-full"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: opacity, y: 0 }}
                            transition={{ duration: 0.3, delay: 0.2 }}
                          >
                            <HealthAIIcon className="mt-1" />
                            <div className="flex-1 overflow-hidden">
                              <div className="ai-message max-w-[85%]">
                                <p className="break-words text-foreground whitespace-pre-wrap">
                                  {message.response}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Prenatal Health Assistant
                                </span>

                                {/* Listen button for each message */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-2 text-xs flex items-center gap-1"
                                  onClick={() =>
                                    setTextToSpeak({ text: message.response, id: Date.now() })
                                  }
                                >
                                  <Volume2 className="h-3 w-3" />
                                  Listen
                                </Button>
                              </div>

                              {message.suggestedQuestions?.length > 0 && (
                                <motion.div
                                  className="mt-4 flex flex-wrap gap-2"
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: opacity, y: 0 }}
                                  transition={{ duration: 0.3, delay: 0.4 }}
                                >
                                  <div className="mt-2 w-full">
                                    <h3 className="text-sm font-medium text-primary flex items-center">
                                      <LightbulbIcon className="w-4 h-4 mr-2" />
                                      Suggested Questions
                                    </h3>
                                  </div>
                                  <div className="flex flex-wrap gap-2 max-w-full">
                                    {message.suggestedQuestions.map((question, idx) => (
                                      <motion.div
                                        key={idx}
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

                        {/* Streaming Response (if this is the current streaming message) */}
                        {message.id === currentStreamingId && (
                          <motion.div
                            className="flex items-start gap-3 w-full"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <HealthAIIcon isResponding={true} className="mt-1" />
                            <div className="flex-1 overflow-hidden">
                              <div className="ai-message max-w-[85%]">
                                {retryCount > 0 && (
                                  <div className="mb-2 text-accent flex items-center gap-1 text-sm">
                                    <AlertCircle className="w-4 h-4" />
                                    <span>
                                      Retrying... ({retryCount}/{maxRetries})
                                    </span>
                                  </div>
                                )}
                                {streamingResponse ? (
                                  <p className="break-words text-foreground whitespace-pre-wrap">
                                    {streamingResponse}
                                    <motion.span
                                      animate={{ opacity: [0, 1, 0] }}
                                      transition={{
                                        repeat: Number.POSITIVE_INFINITY,
                                        duration: 1.5,
                                      }}
                                    >
                                      ▌
                                    </motion.span>
                                  </p>
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
                              <div className="flex items-center gap-2 mt-2">
                                <span className="text-xs text-muted-foreground">
                                  Prenatal Health Assistant
                                </span>
                              </div>

                              {/* Streaming Suggestions */}
                              {streamingSuggestions.length > 0 && (
                                <motion.div
                                  className="mt-4 flex flex-wrap gap-2"
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
                    )
                  })}
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

            {/* Voice Chat Dialog */}
            <VoiceChatDialog
              isOpen={isVoiceChatOpen}
              onClose={() => setIsVoiceChatOpen(false)}
              onSpeechInput={handleSubmit}
              language={language}
              isSpeaking={isSpeaking}
              isListening={isListening}
              transcript={transcript}
              startListening={() => setIsListening(true)}
              stopListening={() => setIsListening(false)}
              lastResponse={lastResponse}
            />

            {/* Fixed Input Container */}
            <VoiceTooltip />
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
                        textToSpeak={textToSpeak.text}
                        language={language}
                        key={`voice-controls-${textToSpeak.id}`}
                        onVoiceChatToggle={toggleVoiceChat}
                        isListeningState={[isListening, setIsListening]}
                        isSpeakingState={[isSpeaking, setIsSpeaking]}
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
      <SpeechDebug />
    </div>
  )
}
