import { useState } from 'react'
import { parseCapacityInput } from '../utils/raidCalculations'
import { calculateCopyDurationSeconds, formatCopyDuration } from '../utils/copyDuration'
import AboutSection from './AboutSection'

const volumeUnits = [
  ['Go', 'Go'],
  ['To', 'To'],
  ['Po', 'Po'],
  ['GiB', 'GiB'],
  ['TiB', 'TiB'],
  ['PiB', 'PiB'],
]

const throughputUnits = [
  ['Mo/s', 'Mo/s'],
  ['Go/s', 'Go/s'],
  ['Mbit/s', 'Mbit/s'],
  ['Gbit/s', 'Gbit/s'],
]

export default function CopyDurationEstimator() {
  const [volume, setVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('Go')
  const [throughput, setThroughput] = useState('')
  const [throughputUnit, setThroughputUnit] = useState('Mo/s')

  const parsedVolume = parseCapacityInput(volume)
  const parsedThroughput = parseCapacityInput(throughput)
  const volumeError = volume.trim() && (!Number.isFinite(parsedVolume) || parsedVolume <= 0)
    ? 'Saisissez un volume supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const throughputError = throughput.trim() && (!Number.isFinite(parsedThroughput) || parsedThroughput <= 0)
    ? 'Saisissez un débit supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const ready = volume.trim() && throughput.trim() && !volumeError && !throughputError
  const durationSeconds = ready
    ? calculateCopyDurationSeconds(parsedVolume, volumeUnit, parsedThroughput, throughputUnit)
    : Number.NaN
  const calculationError = ready && !Number.isFinite(durationSeconds)

  return (
    <>
      <section className="copy-estimator panel" aria-labelledby="copy-estimator-title">
        <div className="section-intro">
          <span>ESTIMATION DE TRANSFERT</span>
          <h2 id="copy-estimator-title">Combien de temps prendra la copie ?</h2>
          <p>
            Indiquez le volume de données et le débit de transfert pour obtenir une estimation
            théorique.
          </p>
        </div>
        <div className="copy-estimator-grid">
          <div className="copy-estimator-field">
            <label htmlFor="copy-volume">Volume de données</label>
            <div className="copy-estimator-input">
              <input
                id="copy-volume"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Volume de données"
                value={volume}
                onChange={event => setVolume(event.target.value)}
                aria-invalid={Boolean(volumeError)}
                aria-describedby="copy-volume-help"
              />
              <select
                aria-label="Unité du volume"
                value={volumeUnit}
                onChange={event => setVolumeUnit(event.target.value)}
              >
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
              </select>
            </div>
            <small
              id="copy-volume-help"
              className={volumeError ? 'field-error' : ''}
              role={volumeError ? 'alert' : undefined}
            >
              {volumeError || 'Les unités Go/Mo sont décimales ; GiB/MiB sont binaires.'}
            </small>
          </div>
          <div className="copy-estimator-field">
            <label htmlFor="copy-throughput">Débit de transfert</label>
            <div className="copy-estimator-input">
              <input
                id="copy-throughput"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Débit de transfert"
                value={throughput}
                onChange={event => setThroughput(event.target.value)}
                aria-invalid={Boolean(throughputError)}
                aria-describedby="copy-throughput-help"
              />
              <select
                aria-label="Unité du débit"
                value={throughputUnit}
                onChange={event => setThroughputUnit(event.target.value)}
              >
                {throughputUnits.map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
              </select>
            </div>
            <small
              id="copy-throughput-help"
              className={throughputError ? 'field-error' : ''}
              role={throughputError ? 'alert' : undefined}
            >
              {throughputError || 'Les débits en bit/s sont convertis en octets/s (8 bits = 1 octet).'}
            </small>
          </div>
        </div>
        {calculationError
          ? <p className="error copy-estimator-error" role="alert">La durée calculée est trop grande pour être représentée.</p>
          : ready && <div className="copy-estimator-result" aria-live="polite">
            <span>Durée théorique estimée</span>
            <strong>{formatCopyDuration(durationSeconds)}</strong>
          </div>}
        <p className="copy-estimator-note">
          Cette estimation suppose un débit constant et ne tient pas compte des ralentissements, du
          protocole, des temps d’accès ni des autres activités du système.
        </p>
      </section>
      <AboutSection
        className="about-section--centered"
        eyebrow="À PROPOS DE L’ESTIMATION"
        title="Estimez une durée de transfert théorique"
        description="Associez un volume de données à un débit pour obtenir une estimation immédiate, que les unités soient décimales, binaires ou exprimées en bits."
        items={[
          {
            icon: 'capacity',
            label: 'Volume',
            value: '4 unités',
            description: 'Saisissez des octets Mo, Go, MiB ou GiB.'
          },
          {
            icon: 'performance',
            label: 'Débit',
            value: '4 unités',
            description: 'Choisissez un débit en octets par seconde ou en bits par seconde.'
          },
          {
            icon: 'resilience',
            label: 'Calcul',
            value: 'Instantané',
            description: 'La durée est recalculée à chaque modification du volume ou du débit.'
          },
          {
            icon: 'rebuild',
            label: 'Hypothèse',
            value: 'Débit constant',
            description: 'L’estimation ne modélise ni les ralentissements ni les temps d’accès.'
          }
        ]}
        highlights={['Unités décimales et binaires', 'Conversion des bits en octets', 'Aucune donnée envoyée']}
      />
    </>
  )
}
