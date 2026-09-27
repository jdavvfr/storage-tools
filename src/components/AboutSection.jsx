import { useId } from 'react'
import { useLanguage } from '../LanguageContext'
import './AboutSection.css'

const ICONS = {
  capacity: <>
    <path d="M4 7h16v12H4z" />
    <path d="M7 4h10v3M8 15h8M8 11h3" />
  </>,
  performance: <>
    <path d="M4 15a8 8 0 0 1 16 0" />
    <path d="m12 15 4-5M6 19h12" />
  </>,
  resilience: <>
    <path d="M12 3 5 6v5c0 4.4 2.8 8.1 7 10 4.2-1.9 7-5.6 7-10V6z" />
    <path d="m9 12 2 2 4-5" />
  </>,
  rebuild: <>
    <path d="M20 11a8 8 0 1 0-2.3 5.7" />
    <path d="M20 5v6h-6" />
  </>
}

function AboutCard({ icon, label, value, description }) {
  return (
    <article className="about-card">
      <div className="about-card__icon">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {ICONS[icon]}
        </svg>
      </div>
      <div className="about-card__content">
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{description}</p>
      </div>
    </article>
  )
}

export default function AboutSection({
  eyebrow,
  title,
  description,
  items,
  highlights = [],
  className = ''
}) {
  const headingId = `about-${useId()}`
  const { t } = useLanguage()

  return (
    <section className={`panel about-section ${className}`} aria-labelledby={headingId}>
      <div className="section-intro">
        <span>{eyebrow}</span>
        <h2 id={headingId}>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="about-grid">
        {items.map(item => <AboutCard key={item.label} {...item} />)}
      </div>
      {highlights.length > 0 && (
        <div className="about-pill-row">
          {highlights.map(highlight => <span key={highlight}>{highlight}</span>)}
        </div>
      )}
      <section className="about-section__site-info" aria-labelledby={`${headingId}-site-info`}>
        <h3 id={`${headingId}-site-info`}>{t('À PROPOS DE STORAGE TOOLS')}</h3>
        <p>{t('Storage Tools propose des calculateurs et outils de dimensionnement pour le stockage, la protection des données et les infrastructures de datacenter.')}</p>
        <p>{t('Les résultats fournis sont des estimations destinées à faciliter les études et avant-ventes. Ils doivent être validés au regard des recommandations constructeurs et des exigences du projet.')}</p>
        <p className="site-info__copyright">Storage Tools © 2026 Jeremie D&apos;Agostino<br />Released under the MIT License</p>
      </section>
    </section>
  )
}
