import type { NextRequest } from 'next/server'
import OpenAI from 'openai'

export async function POST(req: NextRequest) {
  console.log('=== TEST MODEL ENDPOINT HIT ===')

  // Check if HF_TOKEN is available
  if (!process.env.HF_TOKEN) {
    console.error('HF_TOKEN environment variable is not set')
    return new Response(JSON.stringify({ error: 'API token not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const prompt = `You are a prenatal health assistant. Answer ONLY in clear, grammatical English with proper spacing between words.

CRITICAL: You MUST respond in perfect English only. Use proper spelling, grammar, and word spacing.

Question: What are the signs of labor?

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

    console.log('Testing with prompt length:', prompt.length)

    // Test non-streaming first
    console.log('=== TESTING NON-STREAMING ===')
    const nonStreamingResponse = await openai.chat.completions.create({
      model: 'tgi',
      messages: [{ role: 'user', content: prompt }],
      stream: false,
    })

    const fullResponse = nonStreamingResponse.choices[0]?.message?.content || 'No content'
    console.log('Non-streaming response length:', fullResponse.length)
    console.log('Non-streaming response (first 200 chars):', fullResponse.substring(0, 200))
    console.log('Full non-streaming response:', JSON.stringify(fullResponse))

    // Test streaming
    console.log('\n=== TESTING STREAMING ===')
    const stream = await openai.chat.completions.create({
      model: 'tgi',
      messages: [{ role: 'user', content: prompt }],
      stream: true,
    })

    let streamedContent = ''
    let chunkCount = 0
    const chunks: string[] = []

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        chunkCount++
        streamedContent += content
        chunks.push(content)
        if (chunkCount <= 10) {
          console.log(`Chunk ${chunkCount}:`, JSON.stringify(content))
        }
      }
    }

    console.log('Streaming total chunks:', chunkCount)
    console.log('Streaming content length:', streamedContent.length)
    console.log('Streaming first 200 chars:', streamedContent.substring(0, 200))
    console.log('Streaming matches non-streaming:', streamedContent === fullResponse)

    // Analysis
    const analyzeText = (text: string, label: string) => {
      const spaceCount = (text.match(/ /g) || []).length
      const wordCount = text.split(/\s+/).filter((w) => w.length > 0).length
      const hasLongSequences = /[a-z]{25,}/.test(text)
      const hasProperSpacing = spaceCount > text.length / 20
      const avgWordLength = text.replace(/[^a-zA-Z]/g, '').length / Math.max(wordCount, 1)

      console.log(`\n=== ${label} ANALYSIS ===`)
      console.log('Space count:', spaceCount)
      console.log('Word count:', wordCount)
      console.log('Avg word length:', avgWordLength.toFixed(2))
      console.log('Has long sequences (25+ chars):', hasLongSequences)
      console.log('Has proper spacing ratio:', hasProperSpacing)
      console.log('Contains ANSWER:', text.includes('ANSWER:'))
      console.log('Contains SUGGESTED_QUESTIONS:', text.includes('SUGGESTED_QUESTIONS:'))

      if (hasLongSequences) {
        const matches = text.match(/[a-z]{25,}/g)
        console.log('Long sequences found:', matches?.slice(0, 3))
      }

      return {
        spaceCount,
        wordCount,
        hasLongSequences,
        hasProperSpacing,
        avgWordLength,
      }
    }

    const nonStreamingAnalysis = analyzeText(fullResponse, 'NON-STREAMING')
    const streamingAnalysis = analyzeText(streamedContent, 'STREAMING')

    return new Response(
      JSON.stringify(
        {
          success: true,
          prompt_length: prompt.length,
          non_streaming: {
            content: fullResponse,
            length: fullResponse.length,
            analysis: nonStreamingAnalysis,
          },
          streaming: {
            content: streamedContent,
            length: streamedContent.length,
            chunk_count: chunkCount,
            first_10_chunks: chunks.slice(0, 10),
            analysis: streamingAnalysis,
            matches_non_streaming: streamedContent === fullResponse,
          },
        },
        null,
        2
      ),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error) {
    console.error('Error testing model:', error)
    return new Response(
      JSON.stringify(
        {
          error: 'Test failed',
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        },
        null,
        2
      ),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}
