import { useState } from 'react'
import { parseCapacityInput } from '../utils/raidCalculations'
import { calculateVolumeGrowth } from '../utils/volumeGrowth'
import AboutSection from './AboutSection'

const volumeUnits = [
  ['o', 'o'],
  ['ko', 'ko (déc.)'],
  ['Mo', 'Mo (déc.)'],
  ['Go', 'Go (déc.)'],
  ['To', 'To (déc.)'],
  ['KiB', 'KiB (bin.)'],
  ['MiB', 'MiB (bin.)'],
  ['GiB', 'GiB (bin.)'],
  ['TiB', 'TiB (bin.)'],
]

const formatVolume = value => new Intl.NumberFormat('fr-FR', {
  maximumSignificantDigits: 12
}).format(value)

export default function VolumeGrowthCalculator() {
  const [sourceVolume, setSourceVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('To')
  const [annualGrowthRate, setAnnualGrowthRate] = useState('')
  const [years, setYears] = useState('')

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
          <span>PROJECTION DE CAPACITÉ</span>
          <h2 id="growth-calculator-title">Calculez la croissance d’une volumétrie</h2>
          <p>
            Projetez un volume sur plusieurs années à partir d’un taux de croissance annuel composé.
          </p>
        </div>
        <div className="growth-calculator-grid">
          <div className="growth-calculator-field">
            <label htmlFor="growth-source-volume">Volume source</label>
            <div className="growth-calculator-input">
              <input
                id="growth-source-volume"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 12,5"
                value={sourceVolume}
                onChange={event => setSourceVolume(event.target.value)}
                aria-invalid={Boolean(sourceVolumeError)}
                aria-describedby="growth-source-volume-help"
              />
              <select
                aria-label="Unité du volume source"
                value={volumeUnit}
                onChange={event => setVolumeUnit(event.target.value)}
              >
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
              </select>
            </div>
            <small
              id="growth-source-volume-help"
              className={sourceVolumeError ? 'field-error' : ''}
              role={sourceVolumeError ? 'alert' : undefined}
            >
              {sourceVolumeError || 'La volumétrie cible conserve cette unité.'}
            </small>
          </div>
          <div className="growth-calculator-field">
            <label htmlFor="growth-annual-rate">Taux de croissance annuel</label>
            <div className="growth-calculator-input growth-calculator-input--single">
              <input
                id="growth-annual-rate"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 5"
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
              {growthRateError || 'Taux composé appliqué une fois par année.'}
            </small>
          </div>
          <div className="growth-calculator-field">
            <label htmlFor="growth-years">Nombre d’années</label>
            <div className="growth-calculator-input growth-calculator-input--single">
              <input
                id="growth-years"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Ex. 5"
                value={years}
                onChange={event => setYears(event.target.value)}
                aria-invalid={Boolean(yearsError)}
                aria-describedby="growth-years-help"
              />
              <span aria-hidden="true">ans</span>
            </div>
            <small
              id="growth-years-help"
              className={yearsError ? 'field-error' : ''}
              role={yearsError ? 'alert' : undefined}
            >
              {yearsError || 'Indiquez un nombre entier d’années.'}
            </small>
          </div>
        </div>
        {calculationError
          ? <p className="error growth-calculator-error" role="alert">La volumétrie calculée est trop grande pour être représentée.</p>
          : ready && <div className="growth-calculator-result" aria-live="polite">
            <span>Volumétrie cible après {parsedYears} an{parsedYears > 1 ? 's' : ''}</span>
            <strong>{formatVolume(targetVolume)} {volumeUnit}</strong>
          </div>}
        <p className="growth-calculator-note">
          Formule : volume source × (1 + taux annuel / 100)<sup>nombre d’années</sup>. Le calcul
          suppose un taux annuel constant.
        </p>
      </section>
      <AboutSection
        className="about-section--centered"
        eyebrow="À PROPOS DE LA PROJECTION"
        title="Anticipez l’évolution de votre stockage"
        description="Estimez la volumétrie à prévoir avec un taux de croissance annuel composé, sans conversion de l’unité choisie."
        items={[
          {
            icon: 'capacity',
            label: 'Volume',
            value: '9 unités',
            description: 'Saisissez un volume en o, ko, Mo, Go, To, KiB, MiB, GiB ou TiB.'
          },
          {
            icon: 'performance',
            label: 'Croissance',
            value: 'Composée',
            description: 'Le taux annuel est appliqué au volume obtenu l’année précédente.'
          },
          {
            icon: 'resilience',
            label: 'Projection',
            value: 'Multi-annuelle',
            description: 'Indiquez un nombre entier d’années pour calculer la volumétrie cible.'
          },
          {
            icon: 'rebuild',
            label: 'Résultat',
            value: 'Même unité',
            description: 'La cible est affichée dans l’unité du volume source.'
          }
        ]}
        highlights={['Taux composé annuel', 'Virgule ou point décimal', 'Aucune donnée envoyée']}
      />
    </>
  )
}
