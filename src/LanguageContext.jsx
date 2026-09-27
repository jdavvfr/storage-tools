import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { getLanguage, LANGUAGE_STORAGE_KEY, translate } from './i18n'

const LanguageContext = createContext(null)

function loadLanguage() {
  return getLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY))
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(loadLanguage)

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    document.documentElement.lang = language
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: text => translate(text, language)
  }), [language])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used within a LanguageProvider')
  return context
}
