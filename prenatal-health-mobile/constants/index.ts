import type { Language } from "../types"

export const LANGUAGE_NAMES: { [key in Language]: string } = {
  en: "English",
}

export const LANGUAGE_SPECIFIC_SUGGESTIONS: Record<Language, string[]> = {
  en: [
    "What prenatal vitamins should I take?",
    "How often should I have prenatal checkups?",
    "What foods should I avoid during pregnancy?",
    "What are the signs of labor?",
  ],
}

export const ONBOARDING_QUESTIONS = {
  en: {
    welcome: "Onboarding Assistant",
    subtitle: "Let's personalize your experience",
    name: "What's your name?",
    age: "How old are you?",
    pregnancyWeek: "How many weeks pregnant are you?",
    dueDate: "When is your due date?",
    previousPregnancies: "How many previous pregnancies have you had?",
    healthConditions: "Do you have any health conditions we should know about?",
    concerns: "What are your main pregnancy concerns?",
    language: "What's your preferred language?",
  },
}

export const HEALTH_CONDITIONS_OPTIONS = {
  en: [
    "Diabetes",
    "High blood pressure",
    "Heart disease",
    "Asthma",
    "Thyroid disorders",
    "Kidney disease",
    "Mental health conditions",
    "Other",
    "None",
  ],
}

export const PREGNANCY_CONCERNS_OPTIONS = {
  en: [
    "Morning sickness",
    "Weight gain",
    "Baby's development",
    "Labor and delivery",
    "Breastfeeding",
    "Postpartum depression",
    "Financial concerns",
    "Work-life balance",
    "Other",
  ],
}
