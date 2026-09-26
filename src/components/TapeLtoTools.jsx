import { useState } from 'react'
import { parseCapacityInput } from '../utils/raidCalculations'
import { formatCopyDuration } from '../utils/copyDuration'
import {
  calculateLtoCartridges,
  calculateLtoTotalCartridges,
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
  const [volume, setVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('To')
  const [generation, setGeneration] = useState('LTO-9')
  const [compressed, setCompressed] = useState(false)
  const [rateMode, setRateMode] = useState('native')
  const [customRate, setCustomRate] = useState('')
  const [rotationSets, setRotationSets] = useState('1')

  const parsedVolume = parseCapacityInput(volume)
  const volumeError = volume.trim() &&
    (!Number.isFinite(parsedVolume) || parsedVolume <= 0)
    ? 'Saisissez un volume supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const volumeReady = Boolean(volume.trim()) && !volumeError

  const parsedCustomRate = parseCapacityInput(customRate)
  const rateError = rateMode === 'custom' && customRate.trim() &&
    (!Number.isFinite(parsedCustomRate) || parsedCustomRate <= 0)
    ? 'Saisissez un débit supérieur à 0, avec un point ou une virgule décimale.'
    : ''
  const rateReady = rateMode === 'native' ||
    (Boolean(customRate.trim()) && !rateError)

  const parsedRotationSets = parseCapacityInput(rotationSets)
  const rotationSetsError = rotationSets.trim() &&
    (!Number.isSafeInteger(parsedRotationSets) || parsedRotationSets <= 0)
    ? 'Saisissez un nombre entier de jeux/cycles supérieur à 0.'
    : ''
  const rotationSetsReady = Boolean(rotationSets.trim()) && !rotationSetsError

  const cartridgeCount = volumeReady
    ? calculateLtoCartridges(parsedVolume, volumeUnit, generation, compressed)
    : Number.NaN
  const durationSeconds = volumeReady && rateReady
    ? calculateLtoWriteDurationSeconds(
      parsedVolume,
      volumeUnit,
      generation,
      rateMode === 'custom' ? parsedCustomRate : undefined,
    )
    : Number.NaN
  const totalCartridgeCount = Number.isSafeInteger(cartridgeCount) && rotationSetsReady
    ? calculateLtoTotalCartridges(cartridgeCount, parsedRotationSets)
    : Number.NaN

  return (
    <>
      <section className="tape-lto panel" aria-labelledby="lto-title">
        <div className="section-intro">
          <span>DIMENSIONNEMENT TAPE LTO</span>
          <h2 id="lto-title">Calculateur LTO et rotation de bandes</h2>
          <p>Estimez les cartouches nécessaires et la durée d’écriture pour une sauvegarde complète.</p>
        </div>
        <div className="tape-lto-grid">
          <div className="copy-estimator-field">
            <label htmlFor="lto-volume">Volume de données</label>
            <div className="copy-estimator-input">
              <input
                id="lto-volume"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 120"
                value={volume}
                onChange={event => setVolume(event.target.value)}
                aria-invalid={Boolean(volumeError)}
                aria-describedby="lto-volume-help"
              />
              <select aria-label="Unité du volume LTO" value={volumeUnit} onChange={event => setVolumeUnit(event.target.value)}>
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{label}</option>)}
              </select>
            </div>
            <small id="lto-volume-help" className={volumeError ? 'field-error' : ''} role={volumeError ? 'alert' : undefined}>
              {volumeError || 'Les unités To/Go/Mo sont décimales ; TiB/GiB/MiB sont binaires.'}
            </small>
          </div>
          <div className="copy-estimator-field">
            <label htmlFor="lto-generation">Génération LTO</label>
            <select id="lto-generation" value={generation} onChange={event => setGeneration(event.target.value)}>
              {Object.entries(ltoGenerations).map(([name, values]) => (
                <option key={name} value={name}>{name} — {values.nativeCapacityTB} To, {values.nativeThroughputMBps} Mo/s natif</option>
              ))}
            </select>
            <small>
              Capacité native : {ltoGenerations[generation].nativeCapacityTB} To par cartouche ; débit natif : {ltoGenerations[generation].nativeThroughputMBps} Mo/s.
            </small>
          </div>
        </div>
        <label className="lto-compression-option">
          <input type="checkbox" checked={compressed} onChange={event => setCompressed(event.target.checked)} />
          <span>Estimer la capacité avec compression</span>
        </label>
        <p className="tape-lto-assumption">
          {compressed
            ? `Hypothèse indicative : ratio de compression de ${LTO_COMPRESSION_RATIO}:1, soit une capacité estimée de ${ltoGenerations[generation].nativeCapacityTB * LTO_COMPRESSION_RATIO} To par cartouche. Le résultat réel dépend des données et peut être inférieur pour des données peu compressibles.`
            : 'Le calcul utilise la capacité native non comprimée, sans réserve de capacité.'}
        </p>
        <div className="tape-lto-grid tape-lto-grid--options">
          <div className="copy-estimator-field">
            <label htmlFor="lto-rate-mode">Débit d’écriture</label>
            <select id="lto-rate-mode" value={rateMode} onChange={event => setRateMode(event.target.value)}>
              <option value="native">Débit natif ({ltoGenerations[generation].nativeThroughputMBps} Mo/s)</option>
              <option value="custom">Débit personnalisé</option>
            </select>
            <small>Le débit natif de référence est celui de la génération sélectionnée.</small>
          </div>
          {rateMode === 'custom' && <div className="copy-estimator-field">
            <label htmlFor="lto-custom-rate">Débit personnalisé (Mo/s déc.)</label>
            <input
              id="lto-custom-rate"
              type="text"
              inputMode="decimal"
              autoComplete="off"
              placeholder={`Ex. ${ltoGenerations[generation].nativeThroughputMBps}`}
              value={customRate}
              onChange={event => setCustomRate(event.target.value)}
              aria-invalid={Boolean(rateError)}
              aria-describedby="lto-custom-rate-help"
            />
            <small id="lto-custom-rate-help" className={rateError ? 'field-error' : ''} role={rateError ? 'alert' : undefined}>
              {rateError || 'Saisissez un débit strictement positif. 1 Mo/s = 1 000 000 octets/s.'}
            </small>
          </div>}
          <div className="copy-estimator-field">
            <label htmlFor="lto-rotation-sets">Jeux/cycles identiques à conserver</label>
            <input
              id="lto-rotation-sets"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={rotationSets}
              onChange={event => setRotationSets(event.target.value)}
              aria-invalid={Boolean(rotationSetsError)}
              aria-describedby="lto-rotation-sets-help"
            />
            <small id="lto-rotation-sets-help" className={rotationSetsError ? 'field-error' : ''} role={rotationSetsError ? 'alert' : undefined}>
              {rotationSetsError || 'Nombre entier de jeux/cycles complets identiques ; ce calcul ne définit pas de schéma GFS.'}
            </small>
          </div>
        </div>
        {volumeReady && (
          <div className="tape-lto-results" aria-live="polite">
            <div className="copy-estimator-result">
              <span>Cartouches par sauvegarde complète</span>
              {Number.isSafeInteger(cartridgeCount)
                ? <strong>{formatNumber(cartridgeCount)} {cartridgeCount === 1 ? 'cartouche' : 'cartouches'}</strong>
                : <strong className="tape-lto-result-error">Hors plage de calcul</strong>}
            </div>
            <div className="copy-estimator-result">
              <span>Durée d’écriture estimée</span>
              {Number.isFinite(durationSeconds)
                ? <strong>{formatCopyDuration(durationSeconds)}</strong>
                : <strong className="tape-lto-result-error">{rateReady ? 'Durée trop grande à représenter' : 'Débit à renseigner'}</strong>}
            </div>
            <div className="copy-estimator-result">
              <span>Total à acquérir pour {rotationSetsReady ? formatNumber(parsedRotationSets) : '—'} jeux/cycles</span>
              {Number.isSafeInteger(totalCartridgeCount)
                ? <strong>{formatNumber(totalCartridgeCount)} {totalCartridgeCount === 1 ? 'cartouche' : 'cartouches'}</strong>
                : <strong className="tape-lto-result-error">{rotationSetsReady ? 'Hors plage de calcul' : 'Nombre de jeux/cycles à renseigner'}</strong>}
            </div>
          </div>
        )}
        <p className="copy-estimator-note">
          La durée utilise le volume saisi et le débit natif ou personnalisé ; l’hypothèse de compression ne modifie que le calcul de capacité. Elle suppose un débit constant et exclut les temps de montage, les changements de cartouche, les ralentissements, le protocole et les autres activités du système.
        </p>
      </section>
      <AboutSection
        className="about-section--centered"
        eyebrow="À PROPOS DES OUTILS TAPE LTO"
        title="Dimensionnez et estimez vos écritures sur bande"
        description="Un calculateur réunit capacité, durée d’écriture et nombre de jeux/cycles identiques à conserver."
        items={[
          { icon: 'capacity', label: 'Générations', value: 'LTO-7 à LTO-9', description: 'Capacités natives de 6, 12 et 18 To par cartouche.' },
          { icon: 'performance', label: 'Débits natifs', value: '300 à 400 Mo/s', description: 'Débits de référence selon la génération, sans compression.' },
          { icon: 'resilience', label: 'Compression', value: `${LTO_COMPRESSION_RATIO}:1 estimé`, description: 'Hypothèse théorique non garantie, dépendante du contenu des données.' },
          { icon: 'rebuild', label: 'Rotation', value: 'Jeux/cycles identiques', description: 'Le total est le nombre de cartouches par sauvegarde multiplié par le nombre de jeux à conserver ; aucun schéma GFS n’est supposé.' },
        ]}
        highlights={['Arrondi au nombre de cartouches supérieur', 'Débit natif ou personnalisé', 'Aucune donnée envoyée']}
      />
    </>
  )
}
