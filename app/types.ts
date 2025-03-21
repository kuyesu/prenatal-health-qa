export type Language = "en" | "sw" | "lg" | "ru"

export interface Question {
  id: string
  text: string
  language: Language
  response: string
  suggestedQuestions: string[]
  createdAt: string
}

