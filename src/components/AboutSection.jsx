import { useId } from 'react'
import { useLanguage } from '../LanguageContext'
import './AboutSection.css'

export default function AboutSection() {
  const headingId = `site-info-${useId()}`
  const { t } = useLanguage()

  return (
    <footer className="site-info" aria-labelledby={headingId}>
      <h2 id={headingId}>{t('À PROPOS DE STORAGE TOOLS')}</h2>
      <p>{t('Storage Tools propose des calculateurs et outils de dimensionnement pour le stockage, la protection des données et les infrastructures de datacenter.')}</p>
      <p>{t('Les résultats fournis sont des estimations destinées à faciliter les études et avant-ventes. Ils doivent être validés au regard des recommandations constructeurs et des exigences du projet.')}</p>
      <p className="site-info__copyright">Storage Tools © 2026 Jeremie D&apos;Agostino<br />Released under the MIT License</p>
    </footer>
  )
}
