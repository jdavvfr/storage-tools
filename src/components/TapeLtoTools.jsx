import { useState } from 'react'
import { parseCapacityInput } from '../utils/raidCalculations'
import { formatCopyDuration } from '../utils/copyDuration'
import { useLanguage } from '../LanguageContext'
import {
  calculateLtoCartridges,
  calculateLtoTotalCartridges,
  calculateLtoWriteDurationSeconds,
  LTO_COMPRESSION_RATIO,
  ltoGenerations,
} from '../utils/tapeLto'

const volumeUnits = [
  ['To', 'To'],
  ['Go', 'Go'],
  ['TiB', 'TiB'],
  ['GiB', 'GiB'],
]

export default function TapeLtoTools() {
  const { language, t } = useLanguage()
  const [volume, setVolume] = useState('')
  const [volumeUnit, setVolumeUnit] = useState('To')
  const [generation, setGeneration] = useState('LTO-9')
  const [compressed, setCompressed] = useState(false)
  const [jobType, setJobType] = useState('vm')
  const [readerCount, setReaderCount] = useState('1')
  const [rateMode, setRateMode] = useState('native')
  const [customRate, setCustomRate] = useState('')
  const [rotationSets, setRotationSets] = useState('1')
  const formatNumber = value => new Intl.NumberFormat(language === 'en' ? 'en-GB' : 'fr-FR', { maximumFractionDigits: 0 }).format(value)

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

  const parsedReaderCount = parseCapacityInput(readerCount)
  const readerCountError = jobType === 'vm' && readerCount.trim() &&
    (!Number.isSafeInteger(parsedReaderCount) || parsedReaderCount <= 0)
    ? 'Saisissez un nombre entier de lecteurs supérieur à 0.'
    : ''
  const readerCountReady = jobType === 'nas' ||
    (Boolean(readerCount.trim()) && !readerCountError)
  const effectiveReaderCount = jobType === 'vm' && readerCountReady ? parsedReaderCount : 1

  const parsedRotationSets = parseCapacityInput(rotationSets)
  const rotationSetsError = rotationSets.trim() &&
    (!Number.isSafeInteger(parsedRotationSets) || parsedRotationSets <= 0)
    ? 'Saisissez un nombre entier de jeux/cycles supérieur à 0.'
    : ''
  const rotationSetsReady = Boolean(rotationSets.trim()) && !rotationSetsError

  const cartridgeCount = volumeReady
    ? calculateLtoCartridges(parsedVolume, volumeUnit, generation, compressed)
    : Number.NaN
  const durationSeconds = volumeReady && rateReady && readerCountReady
    ? calculateLtoWriteDurationSeconds(
      parsedVolume,
      volumeUnit,
      generation,
      rateMode === 'custom' ? parsedCustomRate : undefined,
      effectiveReaderCount,
    )
    : Number.NaN
  const totalCartridgeCount = Number.isSafeInteger(cartridgeCount) && rotationSetsReady
    ? calculateLtoTotalCartridges(cartridgeCount, parsedRotationSets)
    : Number.NaN

  return (
    <>
      <section className="tape-lto panel" aria-labelledby="lto-title">
        <div className="section-intro">
          <span>{t('DIMENSIONNEMENT TAPE LTO')}</span>
          <h2 id="lto-title">{t('Calculateur LTO et rotation de bandes')}</h2>
          <p>{t('Estimez les cartouches nécessaires et la durée d’écriture pour une sauvegarde complète.')}</p>
        </div>
        <div className="tape-lto-grid">
          <div className="copy-estimator-field">
            <label htmlFor="lto-volume">{t('Volume de données')}</label>
            <div className="copy-estimator-input">
              <input
                id="lto-volume"
                type="number"
                step="1"
                autoComplete="off"
                placeholder={t('Volume de données')}
                value={volume}
                onChange={event => setVolume(event.target.value)}
                aria-invalid={Boolean(volumeError)}
                aria-describedby="lto-volume-help"
              />
              <select aria-label={t('Unité du volume LTO')} value={volumeUnit} onChange={event => setVolumeUnit(event.target.value)}>
                {volumeUnits.map(([unit, label]) => <option key={unit} value={unit}>{t(label)}</option>)}
              </select>
            </div>
            <small id="lto-volume-help" className={volumeError ? 'field-error' : ''} role={volumeError ? 'alert' : undefined}>
              {t(volumeError || 'Les unités To/Go/Mo sont décimales ; TiB/GiB/MiB sont binaires.')}
            </small>
          </div>
          <div className="copy-estimator-field">
            <label htmlFor="lto-generation">{t('Génération LTO')}</label>
            <select id="lto-generation" value={generation} onChange={event => setGeneration(event.target.value)}>
              {Object.entries(ltoGenerations).map(([name, values]) => (
                <option key={name} value={name}>{name} — {values.nativeCapacityTB} {t('To')}, {values.nativeThroughputMBps} {t('Mo/s')} {t('natif')}</option>
              ))}
            </select>
            <small>
              {t('Capacité native :')} {ltoGenerations[generation].nativeCapacityTB} {t('To')} {t('par cartouche ; débit natif :')} {ltoGenerations[generation].nativeThroughputMBps} {t('Mo/s')}.
            </small>
          </div>
        </div>
        <label className="lto-compression-option">
          <input type="checkbox" checked={compressed} onChange={event => setCompressed(event.target.checked)} />
          <span>{t('Estimer la capacité avec compression')}</span>
        </label>
        <p className="tape-lto-assumption">
          {compressed
            ? <>{t('Hypothèse indicative : ratio de compression de')} {LTO_COMPRESSION_RATIO}:1, {t('soit une capacité estimée de')} {ltoGenerations[generation].nativeCapacityTB * LTO_COMPRESSION_RATIO} {t('To')} {t('par cartouche. Le résultat réel dépend des données et peut être inférieur pour des données peu compressibles.')}</>
            : t('Le calcul utilise la capacité native non comprimée, sans réserve de capacité.')}
        </p>
        <div className="tape-lto-grid tape-lto-grid--options">
          <div className="copy-estimator-field">
            <label htmlFor="lto-job-type">{t('Type de job')}</label>
            <select
              id="lto-job-type"
              value={jobType}
              onChange={event => {
                setJobType(event.target.value)
                if (event.target.value === 'nas') setReaderCount('1')
              }}
            >
              <option value="vm">{t('Externalisation de VM (parallélisable)')}</option>
              <option value="nas">{t('Job NAS (séquentiel)')}</option>
            </select>
            <small>{t('Le type de job détermine si plusieurs lecteurs peuvent écrire en parallèle.')}</small>
          </div>
          {jobType === 'vm'
            ? <div className="copy-estimator-field">
              <label htmlFor="lto-reader-count">{t('Nombre de lecteurs')}</label>
              <input
                id="lto-reader-count"
                type="number"
                step="1"
                autoComplete="off"
                value={readerCount}
                onChange={event => setReaderCount(event.target.value)}
                aria-invalid={Boolean(readerCountError)}
                aria-describedby="lto-reader-count-help"
              />
              <small id="lto-reader-count-help" className={readerCountError ? 'field-error' : ''} role={readerCountError ? 'alert' : undefined}>
                {t(readerCountError || 'Entrez le nombre de lecteurs d’écriture utilisés simultanément.')}
              </small>
            </div>
            : <p className="tape-lto-job-note">{t('Un job NAS utilise un seul lecteur ; la parallélisation n’est pas proposée.')}</p>}
          <div className="copy-estimator-field">
            <label htmlFor="lto-rate-mode">{t('Débit d’écriture')}</label>
            <select id="lto-rate-mode" value={rateMode} onChange={event => setRateMode(event.target.value)}>
              <option value="native">{t('Débit natif')} ({ltoGenerations[generation].nativeThroughputMBps} {t('Mo/s')})</option>
              <option value="custom">{t('Débit personnalisé')}</option>
            </select>
            <small>{t('Le débit natif de référence est celui de la génération sélectionnée.')}</small>
          </div>
          {rateMode === 'custom' && <div className="copy-estimator-field">
            <label htmlFor="lto-custom-rate">{t('Débit personnalisé (Mo/s déc.)')}</label>
            <input
              id="lto-custom-rate"
              type="number"
              step="1"
              autoComplete="off"
              placeholder={`${language === 'en' ? 'e.g.' : 'Ex.'} ${ltoGenerations[generation].nativeThroughputMBps}`}
              value={customRate}
              onChange={event => setCustomRate(event.target.value)}
              aria-invalid={Boolean(rateError)}
              aria-describedby="lto-custom-rate-help"
            />
            <small id="lto-custom-rate-help" className={rateError ? 'field-error' : ''} role={rateError ? 'alert' : undefined}>
              {t(rateError || 'Saisissez un débit strictement positif. 1 Mo/s = 1 000 000 octets/s.')}
            </small>
          </div>}
          <div className="copy-estimator-field">
            <label htmlFor="lto-rotation-sets">{t('Jeux/cycles identiques à conserver')}</label>
            <input
              id="lto-rotation-sets"
              type="number"
              step="1"
              autoComplete="off"
              value={rotationSets}
              onChange={event => setRotationSets(event.target.value)}
              aria-invalid={Boolean(rotationSetsError)}
              aria-describedby="lto-rotation-sets-help"
            />
            <small id="lto-rotation-sets-help" className={rotationSetsError ? 'field-error' : ''} role={rotationSetsError ? 'alert' : undefined}>
              {t(rotationSetsError || 'Nombre entier de jeux/cycles complets identiques ; ce calcul ne définit pas de schéma GFS.')}
            </small>
          </div>
        </div>
        {volumeReady && (
          <div className="tape-lto-results" aria-live="polite">
            <div className="copy-estimator-result">
              <span>{t('Cartouches par sauvegarde complète')}</span>
              {Number.isSafeInteger(cartridgeCount)
                ? <strong>{formatNumber(cartridgeCount)} {t(cartridgeCount === 1 ? 'cartouche' : 'cartouches')}</strong>
                : <strong className="tape-lto-result-error">{t('Hors plage de calcul')}</strong>}
            </div>
            <div className="copy-estimator-result">
              <span>{t('Durée d’écriture estimée')}</span>
              {Number.isFinite(durationSeconds)
                ? <strong>{formatCopyDuration(durationSeconds, language)}</strong>
                : <strong className="tape-lto-result-error">{t(!rateReady ? 'Débit à renseigner' : !readerCountReady ? 'Nombre de lecteurs à renseigner' : 'Durée trop grande à représenter')}</strong>}
            </div>
            <div className="copy-estimator-result">
              <span>{t('Total à acquérir pour')} {rotationSetsReady ? formatNumber(parsedRotationSets) : '—'} {t('jeux/cycles')}</span>
              {Number.isSafeInteger(totalCartridgeCount)
                ? <strong>{formatNumber(totalCartridgeCount)} {t(totalCartridgeCount === 1 ? 'cartouche' : 'cartouches')}</strong>
                : <strong className="tape-lto-result-error">{t(rotationSetsReady ? 'Hors plage de calcul' : 'Nombre de jeux/cycles à renseigner')}</strong>}
            </div>
          </div>
        )}
        <p className="copy-estimator-note">
          {jobType === 'vm'
            ? <>{t('Pour l’externalisation de VM, la durée suppose une répartition équilibrée et une accélération idéale linéaire : débit total = débit d’un lecteur ×')} {readerCountReady ? formatNumber(effectiveReaderCount) : t('nombre de lecteurs')}.</>
            : t('Pour un job NAS, la durée est calculée avec un seul lecteur, sans parallélisation.')}
          {' '}{t('La capacité et les cartouches restent calculées sur le volume total, sans multiplication par le nombre de lecteurs. L’hypothèse de compression ne modifie que le calcul de capacité. L’estimation suppose un débit constant et exclut les temps de montage, les changements de cartouche, les ralentissements, le protocole et les autres activités du système.')}
        </p>
      </section>
    </>
  )
}
