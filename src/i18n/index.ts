import { createI18n } from 'vue-i18n'
import fr from './fr'
import en from './en'

/** Read saved locale from localStorage, default to 'fr' */
function savedLocale(): 'fr' | 'en' {
  try {
    const saved = localStorage.getItem('kinshasa-locale')
    if (saved === 'en') return 'en'
  } catch { /* SSR or blocked localStorage */ }
  return 'fr'
}

const i18n = createI18n({
  legacy: false, // Composition API mode
  locale: savedLocale(),
  fallbackLocale: 'fr',
  messages: { fr, en },
})

export default i18n
