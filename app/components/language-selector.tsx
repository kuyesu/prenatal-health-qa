'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ChevronDown, Globe } from 'lucide-react'
import { motion } from 'framer-motion'
interface LanguageSelectorProps { language: 'en'; setLanguage: (lang: 'en') => void }

export default function LanguageSelector({ language, setLanguage }: LanguageSelectorProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 rounded-full border-primary/20 hover:bg-primary/10 hover:text-primary transition-all duration-300"
        >
          <span className="font-medium">English</span>
          <motion.div
            animate={{ rotate: [0, 180, 360] }}
            transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
            className="text-primary/50"
          >
            <Globe className="h-4 w-4 text-primary" />
          </motion.div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-[150px] p-1 rounded-xl border-primary/20 bg-background/80 backdrop-blur-md">
        <DropdownMenuItem
          key="en"
          onClick={() => setLanguage('en')}
          className={`rounded-lg my-1 cursor-pointer transition-all duration-300 ${
            language === 'en'
              ? 'bg-primary/10 text-primary font-medium'
              : 'hover:bg-primary/5 hover:text-primary'
          }`}
        >
          <div className="flex items-center gap-2">
            {language === 'en' && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-1.5 h-1.5 rounded-full bg-primary"
              />
            )}
            English
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
