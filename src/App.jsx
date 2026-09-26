import { useState } from 'react'
import CapacityConverter from './components/CapacityConverter'
import CopyDurationEstimator from './components/CopyDurationEstimator'
import RaidCalculator from './components/RaidCalculator'
import './App.css'

function App() {
  const [activeTool, setActiveTool] = useState('raid')

  return <main className="shell">
    <nav className="tool-navigation" aria-label="Outils de stockage">
      <button type="button" className={activeTool === 'raid' ? 'active' : ''} aria-current={activeTool === 'raid' ? 'page' : undefined} onClick={() => setActiveTool('raid')}>RAID Calculator</button>
      <button type="button" className={activeTool === 'converter' ? 'active' : ''} aria-current={activeTool === 'converter' ? 'page' : undefined} onClick={() => setActiveTool('converter')}>Convertisseur To / TiB</button>
      <button type="button" className={activeTool === 'copy' ? 'active' : ''} aria-current={activeTool === 'copy' ? 'page' : undefined} onClick={() => setActiveTool('copy')}>Durée de copie</button>
    </nav>
    <header className="hero"><span>STORAGE TOOLS</span><h1>{activeTool === 'raid' ? 'RAID Calculator' : activeTool === 'converter' ? 'Convertisseur To / TiB' : 'Durée de copie'}</h1><p>{activeTool === 'raid' ? 'Dimensionnement d’un RAID matériel pour serveur capacitif' : activeTool === 'converter' ? 'Conversion rapide entre capacités décimales et binaires' : 'Estimation du temps nécessaire pour transférer un volume de données'}</p></header>
    {activeTool === 'copy' && <CopyDurationEstimator />}
    {activeTool === 'converter' && <CapacityConverter />}
    <RaidCalculator active={activeTool === 'raid'} />
  </main>
}

export default App
