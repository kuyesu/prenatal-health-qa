export type Language = 'en'

export interface Question {
  id: string
  text: string
  language: Language
  response: string
  suggestedQuestions: string[]
  createdAt: string
}
