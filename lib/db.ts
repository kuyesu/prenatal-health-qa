// Type for the question with suggestions in the database
interface DbQuestion {
  id: string
  text: string
  language: string
  response: string
  createdAt: Date
  updatedAt: Date
}

interface DbQuestionWithSuggestions {
  id: string
  questionId: string
  suggestions: string[]
  createdAt: Date
  updatedAt: Date
}

// In-memory storage
const questions: DbQuestion[] = []
const questionSuggestions: DbQuestionWithSuggestions[] = []

// Simple database interface
const db = {
  question: {
    create: async ({ data }: { data: { text: string; language: string; response: string } }) => {
      const now = new Date()
      const id = Date.now().toString()
      const newQuestion: DbQuestion = {
        id,
        text: data.text,
        language: data.language,
        response: data.response,
        createdAt: now,
        updatedAt: now,
      }
      questions.push(newQuestion)
      return newQuestion
    },
    findMany: async ({ orderBy, include }: { orderBy?: any; include?: any }) => {
      // Sort by createdAt if requested
      const sortedQuestions = [...questions].sort((a, b) => {
        if (orderBy?.createdAt === "asc") {
          return a.createdAt.getTime() - b.createdAt.getTime()
        } else {
          return b.createdAt.getTime() - a.createdAt.getTime()
        }
      })

      // Add suggestedQuestions property if requested
      if (include?.suggestedQuestions) {
        return sortedQuestions.map((q) => ({
          ...q,
          suggestedQuestions: questionSuggestions.filter((qs) => qs.questionId === q.id),
        }))
      }

      return sortedQuestions
    },
  },
  questionWithSuggestions: {
    create: async ({ data }: { data: { question: { connect: { id: string } }; suggestions: string[] } }) => {
      const now = new Date()
      const id = Date.now().toString()
      const newSuggestions: DbQuestionWithSuggestions = {
        id,
        questionId: data.question.connect.id,
        suggestions: data.suggestions,
        createdAt: now,
        updatedAt: now,
      }
      questionSuggestions.push(newSuggestions)
      return newSuggestions
    },
  },
}

export default db

