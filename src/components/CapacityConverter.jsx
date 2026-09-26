import { useState } from 'react'
import { parseCapacityInput, tbToTiB, tiBToTB } from '../utils/raidCalculations'
import AboutSection from './AboutSection'

const formatCapacity = value => new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 12,
  useGrouping: false
}).format(value)

export default function CapacityConverter() {
  const [values, setValues] = useState({ tb: '', tib: '' })
  const [error, setError] = useState('')
  const [invalidField, setInvalidField] = useState('')

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
          <span>CONVERSION DE CAPACITÉ</span>
          <h2 id="converter-title">Convertisseur To / TiB</h2>
          <p>
            Convertissez une capacité dans les deux sens. Modifiez l’une des valeurs pour recalculer
            immédiatement l’autre.
          </p>
        </div>
        <div className="converter-grid">
          <label className="converter-field" htmlFor="capacity-tb">
            <span>To (téraoctets décimaux)</span>
            <div className="input-unit">
              <input
                id="capacity-tb"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 1000,5"
                value={values.tb}
                onChange={event => updateValue('tb', event.target.value)}
                aria-invalid={invalidField === 'tb'}
                aria-describedby={invalidField === 'tb' ? 'capacity-error' : 'capacity-tb-help'}
              />
              <em>To</em>
            </div>
            <small id="capacity-tb-help">1 To = 1 000 000 000 000 octets</small>
          </label>
          <span className="converter-equals" aria-hidden="true">⇄</span>
          <label className="converter-field" htmlFor="capacity-tib">
            <span>TiB (tébioctets binaires)</span>
            <div className="input-unit">
              <input
                id="capacity-tib"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Ex. 931,3226"
                value={values.tib}
                onChange={event => updateValue('tib', event.target.value)}
                aria-invalid={invalidField === 'tib'}
                aria-describedby={invalidField === 'tib' ? 'capacity-error' : 'capacity-tib-help'}
              />
              <em>TiB</em>
            </div>
            <small id="capacity-tib-help">1 TiB = 1 099 511 627 776 octets</small>
          </label>
        </div>
        {error && <p className="error converter-error" id="capacity-error" role="alert">{error}</p>}
        <p className="converter-note">
          La conversion distingue les unités décimales (To) des unités binaires (TiB), comme dans
          le calculateur RAID. La virgule et le point sont acceptés comme séparateurs décimaux.
        </p>
      </section>
      <AboutSection
        className="about-section--centered"
        eyebrow="À PROPOS DE LA CONVERSION"
        title="Comparez To et TiB sans ambiguïté"
        description="Convertissez les unités décimales et binaires dans les deux sens, avec un résultat recalculé à chaque saisie."
        items={[
          {
            icon: 'capacity',
            label: 'Unités décimales',
            value: 'To',
            description: 'Base 10 : 1 To représente 1 000 000 000 000 octets.'
          },
          {
            icon: 'performance',
            label: 'Unités binaires',
            value: 'TiB',
            description: 'Base 2 : 1 TiB représente 1 099 511 627 776 octets.'
          },
          {
            icon: 'resilience',
            label: 'Précision',
            value: '12 décimales',
            description: 'La conversion conserve une précision élevée sur le résultat affiché.'
          },
          {
            icon: 'rebuild',
            label: 'Conversion',
            value: 'Instantanée',
            description: 'Modifiez l’une des valeurs pour calculer immédiatement l’autre.'
          }
        ]}
        highlights={['Virgule ou point décimal', 'Conversion dans les deux sens', 'Aucune donnée envoyée']}
      />
    </>
  )
}
