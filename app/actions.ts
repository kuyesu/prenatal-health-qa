"use server"

import db from "@/lib/db"
import type { Question, Language } from "./types"

// Function to save a question to the in-memory database
export async function saveQuestion(
  question: string,
  language: Language,
  response: string,
  suggestedQuestions: string[],
): Promise<Question> {
  try {
    // Parse response to get the answer and suggested questions if not already parsed
    if (response.includes("ANSWER:") && suggestedQuestions.length === 0) {
      const parsedResponse = parseResponse(response)
      response = parsedResponse.answer
      suggestedQuestions = parsedResponse.suggestedQuestions
    }

    // Safety check for medical content - ensure response doesn't contain harmful advice
    if (!isSafeResponse(response)) {
      response = getSafetyDisclaimerResponse(language)
    }

    // Create the question record in the database
    const newQuestion = await db.question.create({
      data: {
        text: question,
        language: language,
        response: response,
      },
    })

    // Create the suggestions record with proper relation
    await db.questionWithSuggestions.create({
      data: {
        question: {
          connect: {
            id: newQuestion.id,
          },
        },
        suggestions: suggestedQuestions,
      },
    })

    // Return the complete question object
    return {
      id: newQuestion.id.toString(),
      text: newQuestion.text,
      language: newQuestion.language as Language,
      response: newQuestion.response,
      suggestedQuestions: suggestedQuestions,
      createdAt: newQuestion.createdAt.toISOString(),
    }
  } catch (error) {
    console.error("Error saving question:", error)

    // Fallback: Return a client-side object if database operations fail
    return {
      id: Date.now().toString(),
      text: question,
      language: language,
      response: response,
      suggestedQuestions: suggestedQuestions,
      createdAt: new Date().toISOString(),
    }
  }
}

// Function to parse the raw response to get answer and suggested questions
function parseResponse(rawResponse: string): { answer: string; suggestedQuestions: string[] } {
  const answerMatch = rawResponse.match(/ANSWER:(.*?)SUGGESTED_QUESTIONS:/s)
  const suggestionsMatch = rawResponse.match(/SUGGESTED_QUESTIONS:(.*)/s)

  let answer = ""
  let suggestedQuestions: string[] = []

  if (answerMatch && answerMatch[1]) {
    answer = answerMatch[1].trim()
  } else {
    answer = rawResponse.trim()
  }

  if (suggestionsMatch && suggestionsMatch[1]) {
    suggestedQuestions = suggestionsMatch[1]
      .split(/\d+\./)
      .filter((q) => q.trim() !== "")
      .map((q) => q.trim())
      .slice(0, 3)
  }

  return { answer, suggestedQuestions }
}

// Function to get all questions from the in-memory database
export async function getQuestions(): Promise<Question[]> {
  try {
    const questions = await db.question.findMany({
      orderBy: {
        createdAt: "asc",
      },
      include: {
        suggestedQuestions: true,
      },
    })

    return questions.map((q) => ({
      id: q.id.toString(),
      text: q.text,
      language: q.language as Language,
      response: q.response,
      suggestedQuestions: q.suggestedQuestions?.[0]?.suggestions || [],
      createdAt: q.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error("Error fetching questions:", error)
    // Return an empty array if database operations fail
    return []
  }
}

// Safety check function for medical content
function isSafeResponse(response: string): boolean {
  const dangerousKeywords = [
    "dosage",
    "take X pills",
    "specific medication",
    "without consulting",
    "instead of medical",
    "cure",
    "guaranteed",
    "permanent",
    "without doctor",
  ]

  // Check if any dangerous keywords are in the response
  return !dangerousKeywords.some((keyword) => response.toLowerCase().includes(keyword.toLowerCase()))
}

// Get appropriate safety disclaimer based on language
function getSafetyDisclaimerResponse(language: Language): string {
  const disclaimers: Record<Language, string> = {
    en: "I apologize, but I cannot provide specific medical advice or medication instructions. Please consult with a qualified healthcare provider for personalized recommendations regarding your health and pregnancy.",
    sw: "Samahani, lakini siwezi kutoa ushauri maalum wa matibabu au maagizo ya dawa. Tafadhali wasiliana na mtoa huduma za afya wenye sifa kwa mapendekezo ya kibinafsi kuhusu afya yako na ujauzito.",
    lg: "Nsonyiwa, naye sisobola kuwa amagezi agenjawulo ag'eby'obulamu wadde okulagira eddagala. Tusaba mubuuze omusawo omuyigirize okufuna amagezi agenjawulo agakwata ku by'obulamu bwo n'olubuto lwo.",
    ru: "Nimbesimire, kwonka tinsobora kukuha enaama erikwiine obwengye bw'eby'amagara nari entekateeka y'emiringo y'okumira emirago. Nooshabwa kukwatagana n'omushaaho ow'obwengye bw'eby'amagara kukuha ebiteekateeko byawe ebikwatiine n'amagara gaawe n'enda yaawe.",
  }

  return disclaimers[language] || disclaimers.en
}

