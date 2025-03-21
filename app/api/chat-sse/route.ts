import type { NextRequest } from "next/server"
import { InferenceClient } from "@huggingface/inference"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  console.log("SSE API route hit: /api/chat-sse")

  // Get params from query string
  const searchParams = req.nextUrl.searchParams
  const question = searchParams.get("question")
  const language = searchParams.get("language")

  console.log("Query params:", { question, language })

  if (!question || !language) {
    console.error("Missing required fields:", { question, language })
    return new Response(`data: ${JSON.stringify({ error: "Question or language is missing", type: "error" })}\n\n`, {
      status: 400,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  // Validate language to prevent injection or incorrect information
  const validLanguages = ["en", "sw", "lg", "ru"]
  if (!validLanguages.includes(language)) {
    return new Response(`data: ${JSON.stringify({ error: "Invalid language specified", type: "error" })}\n\n`, {
      status: 400,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  // Check if HF_TOKEN is available
  if (!process.env.HF_TOKEN) {
    console.error("HF_TOKEN environment variable is not set")
    return new Response(`data: ${JSON.stringify({ error: "API token not configured", type: "error" })}\n\n`, {
      status: 500,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  // Create a robust medical prompt with appropriate disclaimers and format
  const prompt = `You are an AI assistant specializing EXCLUSIVELY in prenatal and postnatal health care.

IMPORTANT MEDICAL DISCLAIMER:
The information provided is for educational purposes only and is not a substitute for professional medical advice.
Always consult with qualified healthcare providers for personalized medical advice.

IMPORTANT RULES:
1. ONLY answer questions related to prenatal care, pregnancy, childbirth, or postnatal care.
2. If a question is about ANY other topic, respond with: "I can only answer questions about prenatal and postnatal care. Please ask a question related to pregnancy, childbirth, or newborn care."
3. For medical emergencies, ALWAYS advise seeking immediate medical attention and do NOT provide specific medical instructions.
4. If the question requests specific dosages or prescription information, state that you cannot provide specific medication advice.
5. Respond ONLY in ${language} language.
6. Format your response exactly as specified below.

Question: ${question}

Format your response exactly like this:
ANSWER: [Your detailed answer to the question in ${language} language, including appropriate disclaimers when necessary]
SUGGESTED_QUESTIONS:
1. [First related follow-up question in ${language} language]
2. [Second related follow-up question in ${language} language]
3. [Third related follow-up question in ${language} language]`

  try {
    // Create a new client for each request
    const client = new InferenceClient(process.env.HF_TOKEN)

    // Create a TransformStream to forward the stream to the client
    const { readable, writable } = new TransformStream()
    const writer = writable.getWriter()
    const encoder = new TextEncoder()

    // Start the response immediately
    const response = new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })

    // Process in the background
    ;(async () => {
      try {
        // Send an initial message to establish the connection
        await writer.write(encoder.encode(`data: ${JSON.stringify({ content: "", type: "init" })}\n\n`))

        // Get the stream from Hugging Face
        console.log("Starting stream from Hugging Face")
        const stream = await client.chatCompletionStream({
          provider: "hf-inference",
          model: "DoD-MUST/Llama-3.2-3B-Instruct-Sunbird-Dialogue.v1",
          messages: [{ role: "user", content: prompt }],
          max_tokens: 800,
          temperature: 0.2,
        })

        // Process the stream
        for await (const chunk of stream) {
          if (chunk.choices && chunk.choices.length > 0) {
            const newContent = chunk.choices[0].delta.content
            if (newContent) {
              // Forward the chunk to the client
              await writer.write(encoder.encode(`data: ${JSON.stringify({ content: newContent, type: "chunk" })}\n\n`))
            }
          }
        }

        // Send completion message
        await writer.write(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`))
      } catch (error: any) {
        console.error("Error in streaming:", error)
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "Error generating response",
              message: error.message,
              type: "error",
            })}\n\n`,
          ),
        )
      } finally {
        await writer.close()
      }
    })()

    return response
  } catch (error: any) {
    console.error("Unhandled error in chat API:", error)
    return new Response(
      `data: ${JSON.stringify({
        error: "Failed to process request. Please try again later.",
        medicalDisclaimer: "This is an AI assistant and not a replacement for professional medical advice.",
        type: "error",
      })}\n\n`,
      {
        status: 500,
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      },
    )
  }
}

