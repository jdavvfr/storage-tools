import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../LanguageContext'
import './ToolInfoPopover.css'

export default function ToolInfoPopover({ name, sections }) {
  const { t } = useLanguage()
  const popoverId = `tool-info-${useId()}`
  const titleId = `${popoverId}-title`
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    function dismissOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [])

  function dismissWithEscape(event) {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault()
      setIsOpen(false)
    }
  }

  return (
    <span className="tool-info" ref={containerRef}>
      <button
        type="button"
        className="tool-info__trigger"
        aria-label={t('Informations sur cet outil')}
        aria-expanded={isOpen}
        aria-controls={popoverId}
        onKeyDown={dismissWithEscape}
        onClick={() => setIsOpen(open => !open)}
      >
        <span aria-hidden="true">?</span>
      </button>
      <section
        id={popoverId}
        className="tool-info__popover"
        aria-labelledby={titleId}
        hidden={!isOpen}
      >
        <span className="tool-info__eyebrow">{t(name)}</span>
        <h2 id={titleId}>{t('Infos sur l’outil')}</h2>
        <div className="tool-info__sections">
          {sections.map(section => (
            <section key={section.title} aria-labelledby={`${popoverId}-${section.title}`}>
              <h3 id={`${popoverId}-${section.title}`}>{t(section.title)}</h3>
              {section.items.map(item => (
                <article key={item.title}>
                  <h4>{t(item.title)}</h4>
                  <p>{t(item.text)}</p>
                </article>
              ))}
            </section>
          ))}
        </div>
      </section>
    </span>
  )
}
