import assert from 'node:assert/strict'
import test from 'node:test'
import { TOOL_INFO } from './toolInfo.js'
import { translate } from './i18n.js'

test('provides distinct translated information for every tool page', () => {
  assert.deepEqual(Object.keys(TOOL_INFO), [
    'recommendation',
    'raid',
    'raid-advanced',
    'converter',
    'copy',
    'growth',
    'tape-lto'
  ])

  const untranslated = []
  for (const [tool, info] of Object.entries(TOOL_INFO)) {
    assert.ok(translate(info.name, 'en'))
    assert.equal(info.sections.length, 2)
    assert.equal(info.sections[0].title, 'Hypothèses')
    assert.equal(info.sections[1].title, 'Limites')

    for (const section of info.sections) {
      if (translate(section.title, 'en') === section.title) untranslated.push(`${tool}: ${section.title}`)
      assert.ok(section.items.length > 0)
      for (const item of section.items) {
        if (translate(item.title, 'en') === item.title) untranslated.push(`${tool}: ${item.title}`)
        if (translate(item.text, 'en') === item.text) untranslated.push(`${tool}: ${item.text}`)
      }
    }
  }
  assert.deepEqual(untranslated, [])

  assert.equal(translate('Informations sur cet outil', 'en'), 'Information about this tool')
  assert.equal(translate('Infos sur l’outil', 'en'), 'Tool information')
})
