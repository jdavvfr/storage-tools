import { useState } from 'react'
import { parseCapacityInput } from '../utils/raidCalculations'
import { formatCopyDuration } from '../utils/copyDuration'
import {
  calculateLtoCartridges,
  calculateLtoWriteDurationSeconds,
  LTO_COMPRESSION_RATIO,
  ltoGenerations,
} from '../utils/tapeLto'
import AboutSection from './AboutSection'

const volumeUnits = [
  ['To', 'To (déc.)'],
  ['Go', 'Go (déc.)'],
  ['TiB', 'TiB (bin.)'],
  ['GiB', 'GiB (bin.)'],
  ['Mo', 'Mo (déc.)'],
  ['MiB', 'MiB (bin.)'],
]

const formatNumber = value => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(value)

export default function TapeLtoTools() {
  const [capacityVolume, setCapacityVolume] = useState('')
  const [capacityUnit, setCapacityUnit] = useState('To')
  const [capacityGeneration, setCapacityGeneration] = useState('LTO-9')
  const [compressed, setCompressed] = useState(false)
  const [durationVolume, setDurationVolume] = useState('')
  const [durationUnit, setDurationUnit] = useState('To')
  const [durationGeneration, setDurationGeneration] = useState('LTO-9')
  const [customRateEnabled, setCustomRateEnabled] = useState(false)
  const [customRate, setCustomRate] = useState('')

  const parsedCapacityVolume = parseCapacityInput(capacityVolume)
  const capacityError = capacityVolume.trim() &&
    (!Number.isFinite(parsedCapacityVolume) || parsedCapacityVolume <= 0)
    ? 'Saisissez un volume supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const capacityReady = Boolean(capacityVolume.trim()) && !capacityError
  const cartridgeCount = capacityReady
    ? calculateLtoCartridges(parsedCapacityVolume, capacityUnit, capacityGeneration, compressed)
    : Number.NaN

  const parsedDurationVolume = parseCapacityInput(durationVolume)
  const durationVolumeError = durationVolume.trim() &&
    (!Number.isFinite(parsedDurationVolume) || parsedDurationVolume <= 0)
    ? 'Saisissez un volume supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const parsedCustomRate = parseCapacityInput(customRate)
  const rateError = customRateEnabled && customRate.trim() &&
    (!Number.isFinite(parsedCustomRate) || parsedCustomRate <= 0)
    ? 'Saisissez un débit supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const durationReady = Boolean(durationVolume.trim()) && !durationVolumeError &&
    (!customRateEnabled || (Boolean(customRate.trim()) && !rateError))
  const durationSeconds = durationReady
    ? calculateLtoWriteDurationSeconds(
      parsedDurationVolume,
      durationUnit,
      durationGeneration,
      customRateEnabled ? parsedCustomRate : undefined,
    )
    : Number.NaN

  return (
    <>
      <section className="tape-lto panel" aria-labelledby="lto-capacity-title">
        <div className="section-intro">
          <span>DIMENSIONNEMENT TAPE LTO</span>
          <h2 id="lto-capacity-title">Calculateur de capacité LTO</h2>
          <p>Estimez le nombre de cartouches nécessaires pour un volume de données donné.</p>
        </div>
        <div className="tape-lto-grid">
          <div className="copy-estimator-field">
            <label htmlFor="lto-capacity-volume">Volume de données</label>
            <div className="copy-estimator-input">
              <input
                id="lto-capacity-volume"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 120"
                value={capacityVolume}
                onChange={event => setCapacityVolume(event.target.value)}
                aria-invalid={Boolean(capacityError)}
                aria-describedby="lto-capacity-help"
              />
              <select aria-label="Unité du volume pour la capacité LTO" value={capacityUnit} onChange={event => setCapacityUnit(event.target.value)}>
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
              </select>
            </div>
            <small id="lto-capacity-help" className={capacityError ? 'field-error' : ''} role={capacityError ? 'alert' : undefined}>
              {capacityError || 'Les unités To/Go/Mo sont décimales ; TiB/GiB/MiB sont binaires.'}
            </small>
          </div>
          <div className="copy-estimator-field">
            <label htmlFor="lto-capacity-generation">Génération LTO</label>
            <select id="lto-capacity-generation" value={capacityGeneration} onChange={event => setCapacityGeneration(event.target.value)}>
              {Object.keys(ltoGenerations).map(generation => <option key={generation} value={generation}>{generation}</option>)}
            </select>
            <small>
              Capacité native : {ltoGenerations[capacityGeneration].nativeCapacityTB} To par cartouche.
            </small>
          </div>
        </div>
        <label className="lto-compression-option">
          <input type="checkbox" checked={compressed} onChange={event => setCompressed(event.target.checked)} />
          <span>Estimer avec compression</span>
        </label>
        <p className="tape-lto-assumption">
          {compressed
            ? `Hypothèse indicative : ratio de compression de ${LTO_COMPRESSION_RATIO}:1, soit une capacité estimée de ${ltoGenerations[capacityGeneration].nativeCapacityTB * LTO_COMPRESSION_RATIO} To par cartouche. Le résultat réel dépend des données et peut être inférieur pour des données peu compressibles.`
            : 'Le calcul utilise la capacité native non comprimée, sans réserve de capacité.'}
        </p>
        {capacityReady && (Number.isFinite(cartridgeCount)
          ? <div className="copy-estimator-result" aria-live="polite">
            <span>Nombre de cartouches requis</span>
            <strong>{formatNumber(cartridgeCount)} {cartridgeCount === 1 ? 'cartouche' : 'cartouches'}</strong>
          </div>
          : <p className="error copy-estimator-error" role="alert">Le résultat dépasse la plage de calcul prise en charge.</p>)}
      </section>

      <section className="tape-lto panel" aria-labelledby="lto-duration-title">
        <div className="section-intro">
          <span>ESTIMATION DE DURÉE D’ÉCRITURE</span>
          <h2 id="lto-duration-title">Calculateur de durée d’écriture tape</h2>
          <p>Estimez le temps d’écriture à partir du volume et du débit natif de la génération LTO.</p>
        </div>
        <div className="tape-lto-grid">
          <div className="copy-estimator-field">
            <label htmlFor="lto-duration-volume">Volume de données</label>
            <div className="copy-estimator-input">
              <input
                id="lto-duration-volume"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 12,5"
                value={durationVolume}
                onChange={event => setDurationVolume(event.target.value)}
                aria-invalid={Boolean(durationVolumeError)}
                aria-describedby="lto-duration-volume-help"
              />
              <select aria-label="Unité du volume pour la durée LTO" value={durationUnit} onChange={event => setDurationUnit(event.target.value)}>
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
              </select>
            </div>
            <small id="lto-duration-volume-help" className={durationVolumeError ? 'field-error' : ''} role={durationVolumeError ? 'alert' : undefined}>
              {durationVolumeError || 'Les unités To/Go/Mo sont décimales ; TiB/GiB/MiB sont binaires.'}
            </small>
          </div>
          <div className="copy-estimator-field">
            <label htmlFor="lto-duration-generation">Génération LTO</label>
            <select id="lto-duration-generation" value={durationGeneration} onChange={event => setDurationGeneration(event.target.value)}>
              {Object.entries(ltoGenerations).map(([generation, values]) => (
                <option key={generation} value={generation}>{generation} — {values.nativeThroughputMBps} Mo/s natif</option>
              ))}
            </select>
            <small>Débit natif de référence (sans compression) : {ltoGenerations[durationGeneration].nativeThroughputMBps} Mo/s.</small>
          </div>
        </div>
        <label className="lto-compression-option">
          <input type="checkbox" checked={customRateEnabled} onChange={event => setCustomRateEnabled(event.target.checked)} />
          <span>Utiliser un débit personnalisé</span>
        </label>
        {customRateEnabled && <div className="copy-estimator-field lto-custom-rate">
          <label htmlFor="lto-custom-rate">Débit personnalisé (Mo/s déc.)</label>
          <input
            id="lto-custom-rate"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder={`Ex. ${ltoGenerations[durationGeneration].nativeThroughputMBps}`}
            value={customRate}
            onChange={event => setCustomRate(event.target.value)}
            aria-invalid={Boolean(rateError)}
            aria-describedby="lto-custom-rate-help"
          />
          <small id="lto-custom-rate-help" className={rateError ? 'field-error' : ''} role={rateError ? 'alert' : undefined}>
            {rateError || 'Saisissez un débit strictement positif. 1 Mo/s = 1 000 000 octets/s.'}
          </small>
        </div>}
        {durationReady && (Number.isFinite(durationSeconds)
          ? <div className="copy-estimator-result" aria-live="polite">
            <span>Durée théorique estimée</span>
            <strong>{formatCopyDuration(durationSeconds)}</strong>
          </div>
          : <p className="error copy-estimator-error" role="alert">La durée calculée est trop grande pour être représentée.</p>)}
        <p className="copy-estimator-note">
          L’estimation suppose un débit constant et exclut les temps de montage, les changements de cartouche,
          les ralentissements, le protocole et les autres activités du système.
        </p>
      </section>
      <AboutSection
        className="about-section--centered"
        eyebrow="À PROPOS DES OUTILS TAPE LTO"
        title="Dimensionnez et estimez vos écritures sur bande"
        description="Deux estimations simples basées sur la capacité native des cartouches et les débits séquentiels natifs annoncés."
        items={[
          { icon: 'capacity', label: 'Générations', value: 'LTO-7 à LTO-9', description: 'Capacités natives de 6, 12 et 18 To par cartouche.' },
          { icon: 'performance', label: 'Débits natifs', value: '300 à 400 Mo/s', description: 'Débits de référence selon la génération, sans compression.' },
          { icon: 'resilience', label: 'Compression', value: `${LTO_COMPRESSION_RATIO}:1 estimé`, description: 'Hypothèse théorique non garantie, dépendante du contenu des données.' },
          { icon: 'rebuild', label: 'Calcul', value: 'Instantané', description: 'Les volumes décimaux et binaires sont convertis avant calcul.' },
        ]}
        highlights={['Arrondi au nombre de cartouches supérieur', 'Débit personnalisé possible', 'Aucune donnée envoyée']}
      />
    </>
  )
}
