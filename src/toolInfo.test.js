import assert from 'node:assert/strict'
import test from 'node:test'
import { TOOL_INFO } from './toolInfo.js'
import { translate } from './i18n.js'

test('provides distinct translated information for every tool page', () => {
  assert.deepEqual(Object.keys(TOOL_INFO), [
    'raid',
    'raid-advanced',
    'converter',
    'copy',
    'growth',
    'tape-lto'
  ])

  for (const info of Object.values(TOOL_INFO)) {
    assert.notEqual(translate(info.eyebrow, 'en'), info.eyebrow)
    assert.notEqual(translate(info.title, 'en'), info.title)
    assert.notEqual(translate(info.description, 'en'), info.description)
  }

  assert.equal(translate('Informations sur cet outil', 'en'), 'Information about this tool')
})
