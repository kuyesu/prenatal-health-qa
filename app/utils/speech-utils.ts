// Map app language to locale for speech APIs
export function mapLanguageToLocale(lang: string, forSpeechRecognition = false): string {
  // If specifically for speech recognition, use widely supported locales
  if (forSpeechRecognition) {
    // Always use en-US for speech recognition as it has the best support across browsers
    return "en-US"
  }

  // Primary locales (preferred for speech synthesis)
  const primaryLocaleMap: Record<string, string> = {
    en: "en-KE", // English (Kenya) - prioritize African English
    sw: "sw-KE", // Swahili (Kenya)
    lg: "lg-UG", // Luganda (Uganda)
    ru: "ru-RU", // Russian
  }

  // Fallback locales (widely supported)
  const fallbackLocaleMap: Record<string, string> = {
    en: "en-US", // English (US) - widely supported
    sw: "sw", // Generic Swahili
    lg: "en-US", // Fallback to English for Luganda
    ru: "ru", // Generic Russian
  }

  // Try to use primary locale first, then fallback
  return primaryLocaleMap[lang] || fallbackLocaleMap[lang] || "en-US"
}

// Get the best available voice for a language and gender preference
export function getBestVoice(language: string, preferFemale = true): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return null
  }

  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) {
    return null
  }

  const locale = mapLanguageToLocale(language)
  const langCode = locale.split("-")[0]

  // African locale preferences
  const africanLocales = ["en-KE", "en-NG", "en-ZA", "en-GH", "sw-KE", "sw-TZ"]

  // First try: exact African locale match with gender preference
  let voice = voices.find(
    (v) =>
      africanLocales.includes(v.lang) &&
      ((preferFemale && v.name.toLowerCase().includes("female")) ||
        (!preferFemale && v.name.toLowerCase().includes("male"))),
  )

  // Second try: exact locale match with gender preference
  if (!voice) {
    voice = voices.find(
      (v) =>
        v.lang === locale &&
        ((preferFemale && v.name.toLowerCase().includes("female")) ||
          (!preferFemale && v.name.toLowerCase().includes("male"))),
    )
  }

  // Third try: language code match with gender preference
  if (!voice) {
    voice = voices.find(
      (v) =>
        v.lang.startsWith(langCode) &&
        ((preferFemale && v.name.toLowerCase().includes("female")) ||
          (!preferFemale && v.name.toLowerCase().includes("male"))),
    )
  }

  // Fourth try: any African locale
  if (!voice) {
    voice = voices.find((v) => africanLocales.some((locale) => v.lang.includes(locale)))
  }

  // Fifth try: exact locale match any gender
  if (!voice) {
    voice = voices.find((v) => v.lang === locale)
  }

  // Sixth try: language code match any gender
  if (!voice) {
    voice = voices.find((v) => v.lang.startsWith(langCode))
  }

  // Last resort: use any available voice
  if (!voice && voices.length > 0) {
    voice = voices[0]
  }

  return voice || null
}

/**
 * Preprocesses text for speech synthesis to improve pronunciation
 * and handle special characters
 */
export function preprocessTextForSpeech(text: string): string {
  if (!text) return ""

  // Replace common abbreviations
  const processedText = text
    // Replace URLs with "link"
    .replace(/https?:\/\/\S+/g, "link")
    // Replace email addresses with "email address"
    .replace(/\S+@\S+\.\S+/g, "email address")
    // Replace multiple newlines with a single one
    .replace(/\n{2,}/g, "\n")
    // Replace multiple spaces with a single one
    .replace(/\s{2,}/g, " ")
    // Add pauses after sentences
    .replace(/\.\s/g, ". ")
    // Add pauses after commas
    .replace(/,\s/g, ", ")
    // Remove special characters that might cause issues
    .replace(/[^\w\s.,?!;:()'"]/g, " ")
    // Trim extra whitespace
    .trim()

  return processedText
}

/**
 * Chunks text into smaller pieces for better speech synthesis
 * Some speech synthesis implementations have limits on text length
 */
export function chunkTextForSpeech(text: string, maxChunkLength = 200): string[] {
  if (!text) return []

  // If text is short enough, return it as is
  if (text.length <= maxChunkLength) {
    return [text]
  }

  const chunks: string[] = []
  let currentChunk = ""

  // Split by sentences
  const sentences = text.split(/(?<=[.!?])\s+/)

  for (const sentence of sentences) {
    // If adding this sentence would exceed the max length, push current chunk and start a new one
    if (currentChunk.length + sentence.length > maxChunkLength && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = ""
    }

    // If a single sentence is longer than max length, split it by commas
    if (sentence.length > maxChunkLength) {
      const commaParts = sentence.split(/(?<=,)\s+/)

      for (const part of commaParts) {
        if (currentChunk.length + part.length > maxChunkLength && currentChunk.length > 0) {
          chunks.push(currentChunk.trim())
          currentChunk = ""
        }

        // If even a comma part is too long, just split it arbitrarily
        if (part.length > maxChunkLength) {
          let remainingPart = part
          while (remainingPart.length > 0) {
            const chunk = remainingPart.substring(0, maxChunkLength)
            chunks.push(chunk.trim())
            remainingPart = remainingPart.substring(maxChunkLength)
          }
        } else {
          currentChunk += part + " "
        }
      }
    } else {
      currentChunk += sentence + " "
    }
  }

  // Add any remaining text
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}

