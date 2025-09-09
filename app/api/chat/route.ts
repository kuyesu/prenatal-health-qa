import type { NextRequest } from 'next/server'
import OpenAI from 'openai'
import { prisma } from '@/lib/db'
import { authenticateToken } from '@/lib/auth'

// Basic English-only sanitization: allow standard ASCII letters, numbers, common punctuation and whitespace.
// Removes any unexpected unicode artifacts that may slip through the model output.
function sanitizeEnglish(text: string): string {
  if (!text) return ''

  // Since API output is clean, do minimal sanitization
  // Only check for obvious gibberish patterns
  const hasLongLowercaseSequence = /[a-z]{35,}/.test(text) // Increased threshold
  const lacksProperSpacing = text.length > 100 && (text.match(/ /g) || []).length < 5 // Very few spaces for very long text

  if (hasLongLowercaseSequence || lacksProperSpacing) {
    console.log('Detected problematic text pattern:', text.substring(0, 100))
    return ''
  }

  // Minimal cleanup - preserve the model's formatting
  return text
    .replace(/\u00A0/g, ' ') // non-breaking spaces to normal
    .replace(/[ ]{3,}/g, '  ') // only collapse excessive spaces (3+)
}

export async function POST(req: NextRequest) {
  console.log('API route hit: /api/chat')

  // Check if this is a mobile app request (has Authorization header)
  const authHeader = req.headers.get('authorization')
  const isMobileRequest = !!authHeader

  // Parse the request body
  let question, language, platform
  try {
    const body = await req.json()
    question = body.question
    language = body.language
    platform = body.platform || 'web'
    console.log('Request body parsed:', { question, language, platform, isMobileRequest })
  } catch (parseError) {
    console.error('Error parsing request body:', parseError)
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!question || !language) {
    console.error('Missing required fields:', { question, language })
    return new Response(JSON.stringify({ error: 'Question or language is missing' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Handle mobile app requests with authentication and database storage
  if (isMobileRequest) {
    try {
      const authResult = await authenticateToken(req)
      if ('error' in authResult) {
        return new Response(JSON.stringify({ error: authResult.error }), {
          status: authResult.status,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Create new chat session if needed or get existing active session
      let chatSession = await prisma.chatSession.findFirst({
        where: {
          userId: authResult.user.id,
          isActive: true,
        },
        orderBy: { createdAt: 'desc' },
      })

      if (!chatSession) {
        chatSession = await prisma.chatSession.create({
          data: {
            userId: authResult.user.id,
            platform: platform || 'mobile',
            language: language || 'en',
          },
        })
      }

      // Get actual AI response using the same model as web version
      let aiResponse = ''
      let suggestedQuestions: string[] = []

      try {
        // Check if HF_TOKEN is available
        if (!process.env.HF_TOKEN) {
          throw new Error('HF_TOKEN environment variable is not set')
        }

        // Create the same prompt as web version
        const prompt = `You are a prenatal health assistant. Answer ONLY in clear, grammatical English with proper spacing between words.

CRITICAL: You MUST respond in perfect English only. Use proper spelling, grammar, and word spacing.

RULES:
1. ONLY answer questions about prenatal care, pregnancy, childbirth, or postnatal care.
2. If the question is not about pregnancy/prenatal health, respond: "I can only answer questions about prenatal and postnatal care. Please ask a question related to pregnancy, childbirth, or newborn care."
3. For medical emergencies, advise seeking immediate medical attention.
4. Include appropriate medical disclaimers.
5. Use clear, readable English with proper punctuation and spacing.

Question: ${sanitizeEnglish(question)}

Format your response EXACTLY like this example:
ANSWER: During pregnancy, it is important to maintain a healthy diet rich in essential nutrients. Focus on eating fruits, vegetables, whole grains, lean proteins, and dairy products. Avoid raw fish, unpasteurized products, and limit caffeine intake. Always consult your healthcare provider for personalized dietary recommendations.

SUGGESTED_QUESTIONS:
1. What vitamins should I take during pregnancy?
2. How much weight should I gain during pregnancy?
3. What exercises are safe during pregnancy?`

        // Create OpenAI client for Hugging Face
        const openai = new OpenAI({
          baseURL: 'https://rxz0wdbx23c1j35h.us-east-1.aws.endpoints.huggingface.cloud/v1/',
          apiKey: process.env.HF_TOKEN,
        })

        // Get non-streaming response for mobile
        const completion = await openai.chat.completions.create({
          model: 'tgi',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: false,
        })

        const fullResponse = completion.choices[0]?.message?.content || ''

        // Parse the response to extract answer and suggestions
        const answerMatch = fullResponse.match(/ANSWER:\s*([\s\S]*?)(?=SUGGESTED_QUESTIONS:|$)/)
        const suggestionsMatch = fullResponse.match(/SUGGESTED_QUESTIONS:\s*([\s\S]*)/)

        if (answerMatch) {
          aiResponse = sanitizeEnglish(answerMatch[1].trim())
        }

        if (suggestionsMatch) {
          const suggestionsText = suggestionsMatch[1]
          const extractedSuggestions = suggestionsText
            .split(/\d+\.\s*/)
            .slice(1) // Remove first empty element
            .map((s) => s.trim())
            .filter((s) => s.length > 0)
            .slice(0, 4) // Limit to 4 suggestions
            .map(sanitizeEnglish)

          suggestedQuestions =
            extractedSuggestions.length > 0
              ? extractedSuggestions
              : [
                  'What should I eat during pregnancy?',
                  'What exercises are safe during pregnancy?',
                  'What are normal pregnancy symptoms?',
                  'When should I contact my doctor?',
                ]
        } else {
          suggestedQuestions = [
            'What should I eat during pregnancy?',
            'What exercises are safe during pregnancy?',
            'What are normal pregnancy symptoms?',
            'When should I contact my doctor?',
          ]
        }

        // Fallback if no valid response
        if (!aiResponse) {
          aiResponse = `Thank you for your question about prenatal health. For your specific question: "${question}", I recommend consulting with your healthcare provider for personalized medical advice. IMPORTANT: This information is for educational purposes only and is not a substitute for professional medical advice.`
        }
      } catch (error) {
        console.error('Error getting AI response for mobile:', error)
        // Fallback response
        aiResponse = `Thank you for your question about prenatal health. I'm here to help with information about pregnancy, childbirth, and postnatal care. For your specific question, I recommend consulting with your healthcare provider for personalized medical advice. IMPORTANT: This information is for educational purposes only and is not a substitute for professional medical advice.`
        suggestedQuestions = [
          'What should I eat during pregnancy?',
          'What exercises are safe during pregnancy?',
          'What are normal pregnancy symptoms?',
          'When should I contact my doctor?',
        ]
      }

      const chatMessage = await prisma.chatMessage.create({
        data: {
          chatSessionId: chatSession.id,
          userMessage: sanitizeEnglish(question),
          aiResponse: aiResponse,
          language: 'en',
          suggestedQuestions: suggestedQuestions,
        },
      })

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            sessionId: chatSession.id,
            response: aiResponse,
            suggestedQuestions: chatMessage.suggestedQuestions,
            chatMessage,
          },
        }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      console.error('Mobile chat error:', error)
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  }

  // Only allow English language
  if (language !== 'en') {
    return new Response(JSON.stringify({ error: 'Only English language is supported.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Check if HF_TOKEN is available
  if (!process.env.HF_TOKEN) {
    console.error('HF_TOKEN environment variable is not set')
    return new Response(JSON.stringify({ error: 'API token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Create a robust medical prompt with appropriate disclaimers and format
  const prompt = `You are a prenatal health assistant. Answer ONLY in clear, grammatical English with proper spacing between words.

CRITICAL: You MUST respond in perfect English only. Use proper spelling, grammar, and word spacing.

RULES:
1. ONLY answer questions about prenatal care, pregnancy, childbirth, or postnatal care.
2. If the question is not about pregnancy/prenatal health, respond: "I can only answer questions about prenatal and postnatal care. Please ask a question related to pregnancy, childbirth, or newborn care."
3. For medical emergencies, advise seeking immediate medical attention.
4. Include appropriate medical disclaimers.
5. Use clear, readable English with proper punctuation and spacing.

Question: ${sanitizeEnglish(question)}

Format your response EXACTLY like this example:
ANSWER: During pregnancy, it is important to maintain a healthy diet rich in essential nutrients. Focus on eating fruits, vegetables, whole grains, lean proteins, and dairy products. Avoid raw fish, unpasteurized products, and limit caffeine intake. Always consult your healthcare provider for personalized dietary recommendations.

SUGGESTED_QUESTIONS:
1. What vitamins should I take during pregnancy?
2. How much weight should I gain during pregnancy?
3. What exercises are safe during pregnancy?`

  try {
    // Create OpenAI client for Hugging Face Inference Endpoint
    const openai = new OpenAI({
      baseURL: 'https://rxz0wdbx23c1j35h.us-east-1.aws.endpoints.huggingface.cloud/v1/',
      apiKey: process.env.HF_TOKEN,
    })

    // Create a TransformStream to forward the stream to the client
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Start the response immediately
    const response = new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
      },
    })

    // Process in the background
    ;(async () => {
      try {
        // Send an initial message to establish the connection
        await writer.write(
          encoder.encode('data: ' + JSON.stringify({ content: '', type: 'init' }) + '\n\n')
        )

        // Get the stream from Hugging Face OpenAI endpoint
        console.log('Starting stream from Hugging Face OpenAI endpoint')
        const stream = await openai.chat.completions.create({
          model: 'tgi',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          stream: true,
        })

        let accumulatedResponse = ''
        let gibberishDetected = false
        let chunkCount = 0

        for await (const chunk of stream) {
          const newContent = chunk.choices[0]?.delta?.content
          if (newContent) {
            accumulatedResponse += newContent
            chunkCount++

            // Check after more chunks to be less aggressive (reduced logging)
            if (chunkCount > 10) {
              const recentText = accumulatedResponse.slice(-200) // Check last 200 chars
              const hasProperSpacing =
                (recentText.match(/ /g) || []).length > recentText.length / 15 // More lenient
              const hasLongConcatenation = /[a-z]{40,}/.test(recentText) // Increased threshold

              if (!hasProperSpacing || hasLongConcatenation) {
                console.log('Detected concatenated words in stream, switching to fallback')
                gibberishDetected = true
                break
              }
            }

            const sanitized = sanitizeEnglish(newContent)

            // Only send if we have actual content - don't trigger fallback for empty sanitization
            if (sanitized) {
              await writer.write(
                encoder.encode(
                  'data: ' + JSON.stringify({ content: sanitized, type: 'chunk' }) + '\n\n'
                )
              )
            } else if (newContent.length <= 5) {
              // For very short content that gets sanitized away, just send it through
              await writer.write(
                encoder.encode(
                  'data: ' + JSON.stringify({ content: newContent, type: 'chunk' }) + '\n\n'
                )
              )
            }
          }
        }

        // If gibberish was detected, send fallback response instead
        if (gibberishDetected) {
          console.log('Gibberish detected, sending fallback response instead of static content')
          const fallbackText = `ANSWER: I'm experiencing some technical difficulties right now. Please try asking your question again.

For immediate medical concerns, please contact your healthcare provider directly.

IMPORTANT: This is an AI assistant providing educational information only and is not a substitute for professional medical advice.

SUGGESTED_QUESTIONS:
1. What are the signs of a healthy pregnancy?
2. How often should I have prenatal checkups?
3. What foods should I eat during pregnancy?`

          // Send fallback response in chunks to simulate streaming
          for (const char of fallbackText) {
            await writer.write(
              encoder.encode('data: ' + JSON.stringify({ content: char, type: 'chunk' }) + '\n\n')
            )
            await new Promise((resolve) => setTimeout(resolve, 10))
          }
        }

        // Send completion message
        await writer.write(encoder.encode('data: ' + JSON.stringify({ type: 'done' }) + '\n\n'))
      } catch (error) {
        console.error('Error in streaming:', error)
        await writer.write(
          encoder.encode(
            'data: ' +
              JSON.stringify({
                error: 'Error generating response',
                message: error instanceof Error ? error.message : 'Unknown error',
                type: 'error',
              }) +
              '\n\n'
          )
        )
      } finally {
        await writer.close()
      }
    })()

    return response
  } catch (error) {
    console.error('Unhandled error in chat API:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to process request. Please try again later.',
        medicalDisclaimer:
          'This is an AI assistant and not a replacement for professional medical advice.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
