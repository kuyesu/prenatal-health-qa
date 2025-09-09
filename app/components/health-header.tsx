'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Heart, Moon, Sun, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import LanguageSelector from './language-selector'
import type { Language } from '../types'
import Image from 'next/image'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import Link from 'next/link'

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
          <Button
            variant="ghost"
            size="sm"
            aria-label="Download on Google Play"
            className="h-auto px-0 py-0 bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent hover:scale-105 focus:scale-105 active:scale-95 transition-transform"
          >
            <Link
              href={'https://expo.dev/artifacts/eas/sRgSEDFW5TPxWHmSu6LGSS.apk'}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/Store_Google_Play_Type_Dark.svg"
                alt="Get it on Google Play"
                width={120}
                height={36}
                style={{ height: 'auto', width: 'auto', maxWidth: '120px', maxHeight: '36px' }}
                priority
              />
            </Link>
          </Button>

          <LanguageSelector language={language} setLanguage={setLanguage} />

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
