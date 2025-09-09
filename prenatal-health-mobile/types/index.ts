export type Language = 'en';

export interface Question {
  id: string;
  text: string;
  language: Language;
  response: string;
  suggestedQuestions: string[];
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  profileCompleted: boolean;
  pregnancyWeek?: number;
  dueDate?: string;
  preferredLanguage: Language;
}

export interface OnboardingData {
  name: string;
  age: number;
  pregnancyWeek: number;
  dueDate: string;
  previousPregnancies: number;
  healthConditions: string[];
  concerns: string[];
  preferredLanguage: Language;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
}
