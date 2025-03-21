'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Moon, Sun, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import LanguageSelector from './language-selector'
import type { Language } from '../types'
import Image from 'next/image'

interface HealthHeaderProps {
  language: Language
  setLanguage: (lang: Language) => void
  languages: { [key in Language]: string }
  toggleSidebar: () => void
  isSidebarOpen: boolean
}

export default function HealthHeader({
  language,
  setLanguage,
  languages,
  toggleSidebar,
  isSidebarOpen,
}: HealthHeaderProps) {
  const { theme, setTheme } = useTheme()
  const [isHovered, setIsHovered] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          <div className="flex items-center gap-2">
            <div className="relative">
              <motion.div
                animate={isHovered ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 10 }}
                onHoverStart={() => setIsHovered(true)}
                onHoverEnd={() => setIsHovered(false)}
                className="relative"
              >
                {/* logo */}
                <Image src="/logo.png" alt="logo" width={40} height={40} />

                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full"
                  />
                )}
              </motion.div>
            </div>
            <h1 className="text-xl font-bold text-primary hidden sm:inline-block">
              Dialogue of Delivery
            </h1>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary sm:hidden">
              PHA
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageSelector language={language} setLanguage={setLanguage} languages={languages} />

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="rounded-full"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="h-[1.2rem] w-[1.2rem] text-yellow-300" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem] text-slate-700" />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
