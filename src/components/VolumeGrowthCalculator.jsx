import { useState } from 'react'
import { parseCapacityInput } from '../utils/raidCalculations'
import { calculateVolumeGrowth } from '../utils/volumeGrowth'
import { useLanguage } from '../LanguageContext'

const volumeUnits = [
  ['Go', 'Go'],
  ['To', 'To'],
  ['Po', 'Po'],
  ['GiB', 'GiB'],
  ['TiB', 'TiB'],
  ['PiB', 'PiB'],
]

export default function VolumeGrowthCalculator() {
  const { language, t } = useLanguage()
  const [sourceVolume, setSourceVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('To')
  const [annualGrowthRate, setAnnualGrowthRate] = useState('')
  const [years, setYears] = useState('')
  const formatVolume = value => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', {
    maximumSignificantDigits: 12
  }).format(value)

  const parsedSourceVolume = parseCapacityInput(sourceVolume)
  const parsedGrowthRate = parseCapacityInput(annualGrowthRate)
  const parsedYears = parseCapacityInput(years)
  const sourceVolumeError = sourceVolume.trim() && (
    !Number.isFinite(parsedSourceVolume) || parsedSourceVolume < 0
  )
    ? 'Saisissez un volume positif ou nul, avec un point ou une virgule décimale.'
    : ''
  const growthRateError = annualGrowthRate.trim() && (
    !Number.isFinite(parsedGrowthRate) || parsedGrowthRate < -100
  )
    ? 'Saisissez un taux annuel supérieur ou égal à -100 %.'
    : ''
  const yearsError = years.trim() && (
    !Number.isSafeInteger(parsedYears) || parsedYears < 1
  )
    ? 'Saisissez un nombre entier d’années supérieur ou égal à 1.'
    : ''
  const ready = sourceVolume.trim() && annualGrowthRate.trim() && years.trim() &&
    !sourceVolumeError && !growthRateError && !yearsError
  const targetVolume = ready
    ? calculateVolumeGrowth(parsedSourceVolume, parsedGrowthRate, parsedYears)
    : Number.NaN
  const calculationError = ready && !Number.isFinite(targetVolume)

  return (
    <>
      <section className="growth-calculator panel" aria-labelledby="growth-calculator-title">
        <div className="section-intro">
          <span>{t('PROJECTION DE CAPACITÉ')}</span>
          <h2 id="growth-calculator-title">{t('Calculez la croissance d’une volumétrie')}</h2>
          <p>
            {t('Projetez un volume sur plusieurs années à partir d’un taux de croissance annuel composé.')}
          </p>
        </div>
        <div className="growth-calculator-grid">
          <div className="growth-calculator-field">
            <label htmlFor="growth-source-volume">{t('Volume source')}</label>
            <div className="growth-calculator-input">
              <input
                id="growth-source-volume"
                type="number"
                step="1"
                autoComplete="off"
                placeholder={t('Volume source')}
                value={sourceVolume}
                onChange={event => setSourceVolume(event.target.value)}
                aria-invalid={Boolean(sourceVolumeError)}
                aria-describedby="growth-source-volume-help"
              />
              <select
                aria-label={t('Unité du volume source')}
                value={volumeUnit}
                onChange={event => setVolumeUnit(event.target.value)}
              >
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{t(label)}</option>)}
              </select>
            </div>
            <small
              id="growth-source-volume-help"
              className={sourceVolumeError ? 'field-error' : ''}
              role={sourceVolumeError ? 'alert' : undefined}
            >
              {t(sourceVolumeError || 'La volumétrie cible conserve cette unité.')}
            </small>
          </div>
          <div className="growth-calculator-field">
            <label htmlFor="growth-annual-rate">{t('Taux de croissance annuel')}</label>
            <div className="growth-calculator-input growth-calculator-input--single">
              <input
                id="growth-annual-rate"
                type="number"
                step="1"
                autoComplete="off"
                placeholder={t('Taux de croissance annuel')}
                value={annualGrowthRate}
                onChange={event => setAnnualGrowthRate(event.target.value)}
                aria-invalid={Boolean(growthRateError)}
                aria-describedby="growth-annual-rate-help"
              />
              <span aria-hidden="true">%</span>
            </div>
            <small
              id="growth-annual-rate-help"
              className={growthRateError ? 'field-error' : ''}
              role={growthRateError ? 'alert' : undefined}
            >
              {t(growthRateError || 'Taux composé appliqué une fois par année.')}
            </small>
          </div>
          <div className="growth-calculator-field">
            <label htmlFor="growth-years">{t('Nombre d’années')}</label>
            <div className="growth-calculator-input growth-calculator-input--single">
              <input
                id="growth-years"
                type="number"
                step="1"
                autoComplete="off"
                placeholder={t("Nombre d'années")}
                value={years}
                onChange={event => setYears(event.target.value)}
                aria-invalid={Boolean(yearsError)}
                aria-describedby="growth-years-help"
              />
              <span aria-hidden="true">{t('ans')}</span>
            </div>
            <small
              id="growth-years-help"
              className={yearsError ? 'field-error' : ''}
              role={yearsError ? 'alert' : undefined}
            >
              {t(yearsError || 'Indiquez un nombre entier d’années.')}
            </small>
          </div>
        </div>
        {calculationError
          ? <p className="error growth-calculator-error" role="alert">{t('La volumétrie calculée est trop grande pour être représentée.')}</p>
          : ready && <div className="growth-calculator-result" aria-live="polite">
            <span>{t('Volumétrie cible après')} {parsedYears} {t(parsedYears > 1 ? 'ans' : 'an')}</span>
            <strong>{formatVolume(targetVolume)} {t(volumeUnit)}</strong>
          </div>}
        <p className="growth-calculator-note">
          {t('Formule : volume source × (1 + taux annuel / 100)^nombre d’années. Le calcul suppose un taux annuel constant.')}
        </p>
      </section>
    </>
  )
}
