'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, Moon, Sun, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from 'next-themes'
import LanguageSelector from './language-selector'
import type { Language } from '../types'
import Image from 'next/image'
import QRCode from 'qrcode'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('')

  // Generate QR code when component mounts
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrDataUrl = await QRCode.toDataURL(
          'https://expo.dev/artifacts/eas/iAA8B91Zz8ck2kRywGnhZj.apk',
          {
            width: 200,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          }
        )
        setQrCodeDataUrl(qrDataUrl)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    }

    generateQRCode()
  }, [])

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
          <Dialog>
            <DialogTrigger asChild className='bg-transparent'>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Download on Google Play"
                className="h-auto px-0 py-0 bg-transparent hover:bg-transparent focus:bg-transparent active:bg-transparent hover:scale-105 focus:scale-105 active:scale-95 transition-transform"
              >
                <Image
                  src="/Store_Google_Play_Type_Dark.svg"
                  alt="Get it on Google Play"
                  width={120}
                  height={36}
                  style={{ height: 'auto', width: 'auto', maxWidth: '120px', maxHeight: '36px' }}
                  priority
                />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Download the Prenatal Health App</DialogTitle>
                <DialogDescription>
                  Scan the QR code below to download from the app store
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center space-y-4 py-4">
                <div className="p-4 rounded-lg shadow-sm bg-white">
                  {qrCodeDataUrl ? (
                    <Image 
                      src={qrCodeDataUrl} 
                      alt="App Download QR Code" 
                      width={200} 
                      height={200}
                      className="rounded-lg"
                    />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-lg">
                      <span className="text-gray-500">Generating QR Code...</span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Point your camera at the QR code to download the app
                </p>
              </div>
            </DialogContent>
          </Dialog>
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
