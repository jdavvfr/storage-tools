import assert from 'node:assert/strict'
import test from 'node:test'
import { getLanguage, LANGUAGE_STORAGE_KEY, translate } from './i18n.js'

test('supports English and French language preferences', () => {
  assert.equal(getLanguage('en'), 'en')
  assert.equal(getLanguage('fr'), 'fr')
  assert.equal(getLanguage('unknown'), 'fr')
  assert.equal(LANGUAGE_STORAGE_KEY, 'storage-tools-language')
})

test('translates interface copy and English storage unit abbreviations', () => {
  assert.equal(translate('RAID Recommendation', 'en'), 'RAID Recommendation')
  assert.equal(translate('Base de données', 'en'), 'Database')
  assert.equal(translate('Capacité maximale', 'en'), 'Maximum capacity')
  assert.equal(translate('Durée de copie', 'en'), 'Copy Duration')
  assert.equal(translate('Unité de capacité', 'en'), 'Capacity unit')
  assert.equal(translate('RAID 0 nécessite au minimum 2 disques actifs', 'en'), 'RAID 0 requires at least 2 active drives')
  assert.equal(translate('Groupe RAID 5 2', 'en'), 'RAID 5 group 2')
  assert.equal(translate('3 hot spares disponibles', 'en'), '3 hot spares available')
  assert.equal(translate('4 Go/s et 2 To', 'en'), '4 GB/s et 2 TB')
  assert.equal(translate('Estimation du temps de reconstruction', 'en'), 'Rebuild time estimate')
  assert.equal(translate('Profil de charge détecté', 'en'), 'Detected workload profile')
  assert.equal(translate('Indice d’exposition', 'en'), 'Exposure index')
})

test('uses English terms for French main navigation and page titles', () => {
  assert.equal(translate('STORAGE TOOLS', 'fr'), 'Storage Tools')
  assert.equal(translate('Outils de stockage', 'fr'), 'Storage Tools')
  assert.equal(translate('RAID Calculator', 'fr'), 'RAID Calculator')
  assert.equal(translate('RAID Calculator Basic', 'fr'), 'RAID Calculator Basic')
  assert.equal(translate('RAID Calculator Advanced', 'fr'), 'RAID Calculator Advanced')
  assert.equal(translate('Unité de capacité', 'fr'), 'Unité de capacité')
  assert.equal(translate('Convertisseur To / TiB', 'fr'), 'TB / TiB Converter')
  assert.equal(translate('Durée de copie', 'fr'), 'Copy Duration')
  assert.equal(translate('Croissance volumétrique', 'fr'), 'Volume Growth')
  assert.equal(translate('Tape LTO', 'fr'), 'LTO Tape')
  assert.equal(translate('Outils Tape LTO', 'fr'), 'LTO Tape Tools')
})

test('translates the general Storage Tools about section into English', () => {
  assert.equal(translate('À PROPOS DE STORAGE TOOLS', 'en'), 'ABOUT STORAGE TOOLS')
  assert.equal(
    translate('Storage Tools propose des calculateurs et outils de dimensionnement pour le stockage, la protection des données et les infrastructures de datacenter.', 'en'),
    'Storage Tools offers calculators and sizing tools for storage, data protection, and datacenter infrastructure.'
  )
  assert.equal(
    translate('Les résultats fournis sont des estimations destinées à faciliter les études et avant-ventes. Ils doivent être validés au regard des recommandations constructeurs et des exigences du projet.', 'en'),
    'The results provided are estimates intended to support studies and presales. They should be validated against vendor recommendations and project requirements.'
  )
})

test('preserves English labels and leaves unknown strings unchanged', () => {
  assert.equal(translate('Outils de stockage', 'en'), 'Storage tools')
  assert.equal(translate('RAID Calculator Basic', 'en'), 'RAID Calculator Basic')
  assert.equal(translate('RAID Calculator Advanced', 'en'), 'RAID Calculator Advanced')
  assert.equal(translate('Durée de copie', 'en'), 'Copy Duration')
  assert.equal(translate('Croissance volumétrique', 'en'), 'Volume Growth')
  assert.equal(translate('Aucun texte anglais', 'fr'), 'Aucun texte anglais')
  assert.equal(translate('A new untranslated label', 'fr'), 'A new untranslated label')
  assert.equal(translate('A new untranslated label', 'en'), 'A new untranslated label')
})
