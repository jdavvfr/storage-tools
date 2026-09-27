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
  assert.equal(translate('Durée de copie', 'en'), 'Copy Duration')
  assert.equal(translate('RAID 0 nécessite au minimum 2 disques actifs', 'en'), 'RAID 0 requires at least 2 active drives')
  assert.equal(translate('Groupe RAID 5 2', 'en'), 'RAID 5 group 2')
  assert.equal(translate('3 hot spares disponibles', 'en'), '3 hot spares available')
  assert.equal(translate('Charge 10 % · facteur domaine ×1.2', 'en'), 'Load 10% · group factor ×1.2')
  assert.equal(translate('4 Go/s et 2 To', 'en'), '4 GB/s et 2 TB')
})

test('keeps French copy and unknown strings unchanged', () => {
  assert.equal(translate('Durée de copie', 'fr'), 'Durée de copie')
  assert.equal(translate('RAID Calculator Advanced', 'fr'), 'Calculateur RAID avancé')
  assert.equal(translate('A new untranslated label', 'en'), 'A new untranslated label')
})
