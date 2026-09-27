import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '../LanguageContext'
import './ToolInfoPopover.css'

export default function ToolInfoPopover({ name, sections }) {
  const { t } = useLanguage()
  const popoverId = `tool-info-${useId()}`
  const titleId = `${popoverId}-title`
  const containerRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const isVisible = (hovered || focused || pinned) && !dismissed

  useEffect(() => {
    function dismissOutside(event) {
      if (!containerRef.current?.contains(event.target)) {
        setPinned(false)
        setDismissed(true)
      }
    }

    document.addEventListener('pointerdown', dismissOutside)
    return () => document.removeEventListener('pointerdown', dismissOutside)
  }, [])

  function dismissWithEscape(event) {
    if (event.key === 'Escape' && isVisible) {
      event.preventDefault()
      setPinned(false)
      setDismissed(true)
      setFocused(false)
      event.currentTarget.blur()
    }
  }

  return (
    <div
      className="tool-info"
      ref={containerRef}
      onMouseEnter={() => {
        setHovered(true)
        setDismissed(false)
      }}
      onMouseLeave={() => {
        setHovered(false)
        setDismissed(false)
      }}
    >
      <button
        type="button"
        className="tool-info__trigger"
        aria-label={t('Informations sur cet outil')}
        aria-expanded={isVisible}
        aria-controls={popoverId}
        onFocus={() => {
          setFocused(true)
          setDismissed(false)
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={dismissWithEscape}
        onClick={() => {
          if (pinned) {
            setPinned(false)
            setDismissed(true)
          } else {
            setPinned(true)
            setDismissed(false)
          }
        }}
      >
        <span aria-hidden="true">?</span>
      </button>
      <section
        id={popoverId}
        className="tool-info__popover"
        aria-labelledby={titleId}
        hidden={!isVisible}
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
    </div>
  )
}
