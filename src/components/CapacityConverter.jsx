import { useState } from 'react'
import { parseCapacityInput, tbToTiB, tiBToTB } from '../utils/raidCalculations'
import { useLanguage } from '../LanguageContext'
import AboutSection from './AboutSection'

export default function CapacityConverter() {
  const { language, t } = useLanguage()
  const [values, setValues] = useState({ tb: '', tib: '' })
  const [error, setError] = useState('')
  const [invalidField, setInvalidField] = useState('')
  const formatCapacity = value => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
    maximumFractionDigits: 12,
    useGrouping: false
  }).format(value)

  function updateValue(field, rawValue) {
    const input = rawValue.trim()
    setInvalidField('')

    if (!input) {
      setValues({ tb: '', tib: '' })
      setError('')
      return
    }

    const value = parseCapacityInput(rawValue)
    if (Number.isNaN(value) || value < 0) {
      setValues({ tb: field === 'tb' ? rawValue : '', tib: field === 'tib' ? rawValue : '' })
      setError('Saisissez une valeur positive ou nulle, avec un point ou une virgule décimale.')
      setInvalidField(field)
      return
    }

    const converted = field === 'tb' ? tbToTiB(value) : tiBToTB(value)
    if (!Number.isFinite(converted)) {
      setValues({ tb: field === 'tb' ? rawValue : '', tib: field === 'tib' ? rawValue : '' })
      setError('Cette valeur est trop grande pour être convertie.')
      setInvalidField(field)
      return
    }

    setValues({
      tb: field === 'tb' ? rawValue : formatCapacity(converted),
      tib: field === 'tib' ? rawValue : formatCapacity(converted)
    })
    setError('')
  }

  return (
    <>
      <section className="converter panel" aria-labelledby="converter-title">
        <div className="section-intro">
          <span>{t('CONVERSION DE CAPACITÉ')}</span>
          <h2 id="converter-title">{t('Convertisseur To / TiB')}</h2>
          <p>
            {t('Convertissez une capacité dans les deux sens. Modifiez l’une des valeurs pour recalculer immédiatement l’autre.')}
          </p>
        </div>
        <div className="converter-grid">
          <label className="converter-field" htmlFor="capacity-tb">
            <span>{t('To (téraoctets décimaux)')}</span>
            <div className="input-unit">
              <input
                id="capacity-tb"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={t('Capacité To')}
                value={values.tb}
                onChange={event => updateValue('tb', event.target.value)}
                aria-invalid={invalidField === 'tb'}
                aria-describedby={invalidField === 'tb' ? 'capacity-error' : 'capacity-tb-help'}
              />
              <em>{t('To')}</em>
            </div>
            <small id="capacity-tb-help">{t('1 To = 1 000 000 000 000 octets')}</small>
          </label>
          <span className="converter-equals" aria-hidden="true">⇄</span>
          <label className="converter-field" htmlFor="capacity-tib">
            <span>{t('TiB (tébioctets binaires)')}</span>
            <div className="input-unit">
              <input
                id="capacity-tib"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder={t('Capacité TiB')}
                value={values.tib}
                onChange={event => updateValue('tib', event.target.value)}
                aria-invalid={invalidField === 'tib'}
                aria-describedby={invalidField === 'tib' ? 'capacity-error' : 'capacity-tib-help'}
              />
              <em>TiB</em>
            </div>
            <small id="capacity-tib-help">{t('1 TiB = 1 099 511 627 776 octets')}</small>
          </label>
        </div>
        {error && <p className="error converter-error" id="capacity-error" role="alert">{t(error)}</p>}
        <p className="converter-note">
          {t('La conversion distingue les unités décimales (To) des unités binaires (TiB), comme dans le calculateur RAID. La virgule et le point sont acceptés comme séparateurs décimaux.')}
        </p>
      </section>
      <AboutSection
        className="about-section--centered"
        eyebrow={t('À PROPOS DE LA CONVERSION')}
        title={t('Comparez To et TiB sans ambiguïté')}
        description={t('Convertissez les unités décimales et binaires dans les deux sens, avec un résultat recalculé à chaque saisie.')}
        items={[
          {
            icon: 'capacity',
            label: t('Unités décimales'),
            value: t('To'),
            description: t('Base 10 : 1 To représente 1 000 000 000 000 octets.')
          },
          {
            icon: 'performance',
            label: t('Unités binaires'),
            value: 'TiB',
            description: t('Base 2 : 1 TiB représente 1 099 511 627 776 octets.')
          },
          {
            icon: 'resilience',
            label: t('Précision'),
            value: t('12 décimales'),
            description: t('La conversion conserve une précision élevée sur le résultat affiché.')
          },
          {
            icon: 'rebuild',
            label: t('Conversion'),
            value: t('Instantanée'),
            description: t('Modifiez l’une des valeurs pour calculer immédiatement l’autre.')
          }
        ]}
        highlights={['Virgule ou point décimal', 'Conversion dans les deux sens', 'Aucune donnée envoyée'].map(text => t(text))}
      />
    </>
  )
}
