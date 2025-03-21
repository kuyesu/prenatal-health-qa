"use client"

import type React from "react"
import { useState, useCallback, useEffect, useRef } from "react"
import { useToast } from "@/hooks/use-toast"
import type { Language, Question } from "./types"
import { getQuestions, saveQuestion } from "./actions"
import { useTheme } from "next-themes"
import { LANGUAGE_SPECIFIC_SUGGESTIONS, TEST_MODE_RESPONSES } from "./constants"
import { getFallbackResponse } from "./utils/fallback-response"

export default function HomeScreen() {
  const [language, setLanguage] = useState<Language>("en")
  const [messages, setMessages] = useState<Question[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [streamingResponse, setStreamingResponse] = useState("")
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
  const [defaultSuggestions, setDefaultSuggestions] = useState<string[]>(LANGUAGE_SPECIFIC_SUGGESTIONS.en)
  const inputRef = useRef<HTMLInputElement>(null)
  const [showDisclaimer, setShowDisclaimer] = useState(true)

  // Update default suggestions when language changes
  useEffect(() => {
    setDefaultSuggestions(LANGUAGE_SPECIFIC_SUGGESTIONS[language])
  }, [language])

  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollHeight, clientHeight } = chatContainerRef.current
      chatContainerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth",
      })
    }
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent | string) => {
      scrollToBottom()
      if (typeof e !== "string") {
        e.preventDefault()
      }
      const questionText = typeof e === "string" ? e : input
      if (!questionText.trim()) return

      // Cancel any ongoing request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      try {
        setIsLoading(true)
        setIsStreaming(true)
        setShowSuggestions(false)
        setStreamingResponse("")
        setStreamingSuggestions([])
        setInput("")
        setRetryCount(0)
        setIsSidebarOpen(false)

        // Add user message immediately
        const tempId = Date.now().toString()
        const userMessage: Question = {
          id: tempId,
          text: questionText,
          language,
          response: "",
          suggestedQuestions: [],
          createdAt: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, userMessage])
        setCurrentStreamingId(tempId)

        let fullResponse = ""

        if (useTestMode) {
          // Test mode - simulate streaming with a fallback response
          console.log("Using test mode with fallback response")

          // Get the appropriate language response
          const fallbackResponse = TEST_MODE_RESPONSES[language] || TEST_MODE_RESPONSES.en

          // Simulate streaming by adding characters one by one
          const chars = fallbackResponse.split("")
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
                .filter((q) => q.trim() !== "")
                .map((q) => q.trim())
                .slice(0, 3)

              setStreamingSuggestions(suggestions)
            }

            scrollToBottom()
          }
        } else {
          // Real API mode
          console.log("Fetching from API:", { question: questionText, language })

          const makeApiRequest = async (currentRetry = 0) => {
            try {
              // Create a new AbortController for this request
              abortControllerRef.current = new AbortController()
              const signal = abortControllerRef.current.signal

              // Calculate exponential backoff delay
              const backoffDelay = currentRetry === 0 ? 0 : Math.min(1000 * Math.pow(2, currentRetry - 1), 10000)
              if (backoffDelay > 0) {
                console.log(`Waiting ${backoffDelay}ms before retry ${currentRetry}...`)
                await new Promise((resolve) => setTimeout(resolve, backoffDelay))
              }

              console.log(`Attempt ${currentRetry + 1}/${maxRetries + 1}: Sending request to API...`)

              // Set up EventSource for Server-Sent Events
              const eventSource = new EventSource(
                `/api/chat-sse?question=${encodeURIComponent(questionText)}&language=${language}`,
              )

              let receivedData = false
              let timeoutId: NodeJS.Timeout | null = null

              // Set a timeout for the entire request
              timeoutId = setTimeout(() => {
                console.log("Request timeout - closing EventSource after 45 seconds")
                eventSource.close()
                if (abortControllerRef.current) {
                  abortControllerRef.current.abort()
                }
                throw new Error("Request timed out after 45 seconds")
              }, 45000) // 45 second timeout

              // Handle normal messages
              eventSource.onmessage = (event) => {
                receivedData = true

                try {
                  const data = JSON.parse(event.data)

                  if (data.error) {
                    console.error("Error from stream:", data.message)
                    throw new Error(data.message || "Unknown stream error")
                  }

                  if (data.type === "chunk" && data.content) {
                    fullResponse += data.content

                    // Parse the accumulated response
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
                        .filter((q) => q.trim() !== "")
                        .map((q) => q.trim())
                        .slice(0, 3)

                      setStreamingSuggestions(suggestions)
                    }

                    scrollToBottom()
                  }

                  if (data.type === "done") {
                    console.log("Stream marked as done")
                    eventSource.close()
                    if (timeoutId) clearTimeout(timeoutId)
                  }
                } catch (parseError) {
                  console.error("Error parsing SSE data:", parseError, "Data:", event.data)
                }
              }

              // Handle errors
              eventSource.onerror = (error) => {
                console.error("EventSource error:", error)
                eventSource.close()
                if (timeoutId) clearTimeout(timeoutId)

                // If we haven't received any data and have retries left, retry
                if (!receivedData && currentRetry < maxRetries) {
                  makeApiRequest(currentRetry + 1)
                } else if (!receivedData) {
                  // Use fallback if all retries failed
                  console.log("All EventSource retries failed. Using fallback response.")
                  fullResponse = getFallbackResponse(language, questionText)
                  setStreamingResponse(fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)?.[1].trim() || "")
                  setStreamingSuggestions(
                    fullResponse
                      .match(/SUGGESTED_QUESTIONS:(.*)/s)?.[1]
                      .split(/\d+\./)
                      .filter((q) => q.trim() !== "")
                      .map((q) => q.trim())
                      .slice(0, 3) || [],
                  )
                }
              }

              // Alternative implementation using fetch and ReadableStream
              try {
                // Make the API request with the abort signal
                const response = await fetch("/api/chat", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    question: questionText,
                    language,
                  }),
                  signal,
                })

                if (!response.ok) {
                  const errorText = await response.text()
                  console.error("API error response:", errorText)
                  throw new Error(`API responded with status ${response.status}: ${errorText}`)
                }

                const reader = response.body?.getReader()
                const decoder = new TextDecoder()

                if (!reader) {
                  throw new Error("Failed to get response reader")
                }

                receivedData = false

                // Read and process the stream
                while (true) {
                  const { done, value } = await reader.read()

                  if (done) {
                    console.log("Stream complete")
                    break
                  }

                  receivedData = true
                  const text = decoder.decode(value, { stream: true })
                  const lines = text.split("\n\n")

                  for (const line of lines) {
                    if (!line.trim() || !line.startsWith("data: ")) continue

                    try {
                      const jsonStr = line.substring(6) // Remove 'data: ' prefix
                      const data = JSON.parse(jsonStr)

                      if (data.error) {
                        console.error("Error from stream:", data.message)
                        throw new Error(data.message || "Unknown stream error")
                      }

                      if (data.type === "chunk" && data.content) {
                        fullResponse += data.content

                        // Parse the accumulated response
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
                            .filter((q) => q.trim() !== "")
                            .map((q) => q.trim())
                            .slice(0, 3)

                          setStreamingSuggestions(suggestions)
                        }

                        scrollToBottom()
                      }

                      if (data.type === "done") {
                        console.log("Stream marked as done")
                        break
                      }
                    } catch (parseError) {
                      console.error("Error parsing SSE data:", parseError, "Line:", line)
                    }
                  }
                }
              } catch (fetchError) {
                if (fetchError.name === "AbortError") {
                  console.log("Fetch request was aborted")
                } else {
                  console.error("Fetch error:", fetchError)

                  // If we have retries left, retry
                  if (currentRetry < maxRetries) {
                    console.log(`Retrying request after fetch error (${currentRetry + 1}/${maxRetries})...`)
                    setRetryCount(currentRetry + 1)
                    return makeApiRequest(currentRetry + 1)
                  } else {
                    // Use fallback if all retries failed
                    console.log("All fetch retries failed. Using fallback response.")
                    fullResponse = getFallbackResponse(language, questionText)
                    setStreamingResponse(fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)?.[1].trim() || "")
                    setStreamingSuggestions(
                      fullResponse
                        .match(/SUGGESTED_QUESTIONS:(.*)/s)?.[1]
                        .split(/\d+\./)
                        .filter((q) => q.trim() !== "")
                        .map((q) => q.trim())
                        .slice(0, 3) || [],
                    )
                  }
                }
              }
            } catch (apiError) {
              console.error("API request error:", apiError)

              // Check if this was an abort error (user cancelled or timeout)
              if (apiError.name === "AbortError") {
                console.log("Request was aborted")

                // If it was a timeout (not user-initiated), retry
                if (currentRetry < maxRetries) {
                  console.log(`Retrying request after timeout (${currentRetry + 1}/${maxRetries})...`)
                  setRetryCount(currentRetry + 1)
                  return makeApiRequest(currentRetry + 1)
                } else {
                  console.log("Max retries reached after timeouts")
                  throw new Error("Request timed out repeatedly. Please try again later.")
                }
              }

              // Network errors should be retried
              if (
                apiError.message.includes("Failed to fetch") ||
                apiError.message.includes("NetworkError") ||
                apiError.message.includes("network") ||
                apiError.message.includes("ECONNREFUSED") ||
                apiError.message.includes("ETIMEDOUT")
              ) {
                if (currentRetry < maxRetries) {
                  console.log(`Retrying request after network error (${currentRetry + 1}/${maxRetries})...`)
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
              console.log("All retries failed. Using fallback response.")
              fullResponse = getFallbackResponse(language, questionText)
              setStreamingResponse(fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)?.[1].trim() || "")
              setStreamingSuggestions(
                fullResponse
                  .match(/SUGGESTED_QUESTIONS:(.*)/s)?.[1]
                  .split(/\d+\./)
                  .filter((q) => q.trim() !== "")
                  .map((q) => q.trim())
                  .slice(0, 3) || [],
              )
            }
          }

          await makeApiRequest()
        }

        // Parse the final response
        const answerMatch = fullResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)
        const suggestionsMatch = fullResponse.match(/SUGGESTED_QUESTIONS:(.*)/s)

        let answer = ""
        let suggestedQuestions: string[] = []

        if (answerMatch && answerMatch[1]) {
          answer = answerMatch[1].trim()
        } else {
          answer = fullResponse.trim()
        }

        if (suggestionsMatch && suggestionsMatch[1]) {
          suggestedQuestions = suggestionsMatch[1]
            .split(/\d+\./)
            .filter((q) => q.trim() !== "")
            .map((q) => q.trim())
            .slice(0, 3)
        }

        try {
          // Save the question and response to the database
          const savedQuestion = await saveQuestion(questionText, language, answer, suggestedQuestions)

          // Update the messages with the saved question
          setMessages((prev) => prev.map((msg) => (msg.id === tempId ? savedQuestion : msg)))
        } catch (dbError) {
          console.error("Error saving to database:", dbError)
          // If database save fails, still update the UI with the response
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === tempId
                ? {
                    ...msg,
                    response: answer,
                    suggestedQuestions: suggestedQuestions,
                  }
                : msg,
            ),
          )
        }

        setCurrentStreamingId(null)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to submit question. Please try again.",
          variant: "destructive",
        })
        console.error("Error submitting question:", error)
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
    [input, language, toast, scrollToBottom, useTestMode, maxRetries],
  )

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const questions = await getQuestions()
        setMessages(questions)
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load chat history. Please try refreshing the page.",
          variant: "destructive",
        })
      }
    }
    fetchQuestions()

    // Clean up any pending requests when component unmounts
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [toast, scrollToBottom])

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen((prev) => !prev)
  }, [])

  // Rest of the component remains the same...
  // (Return JSX as in your original component)
}

