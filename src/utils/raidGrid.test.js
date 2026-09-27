import assert from 'node:assert/strict'
import test from 'node:test'
import { getRaidGridConfig } from './raidGrid.js'

const groups = count => Array.from({ length: count }, (_, index) => ({
  name: `Groupe ${index + 1}`,
  count: 6
}))

test('RAID50 and RAID60 grids preserve the requested group columns', () => {
  for (const raid of ['RAID50', 'RAID60']) {
    assert.equal(getRaidGridConfig(raid, groups(2)).style['--raid-columns'], 2)
    assert.equal(getRaidGridConfig(raid, groups(3)).style['--raid-columns'], 3)
    assert.equal(getRaidGridConfig(raid, groups(7)).style['--raid-columns'], 3)
  }
})

test('large RAID50 and RAID60 groups reduce desktop density', () => {
  const raid50Config = getRaidGridConfig('RAID50', groups(4).map(group => ({ ...group, count: 10 })))
  const raid60Config = getRaidGridConfig('RAID60', groups(4).map(group => ({ ...group, count: 25 })))

  assert.equal(raid50Config.style['--raid-columns'], 2)
  assert.equal(raid60Config.style['--raid-columns'], 1)
  assert.equal(raid50Config.style['--raid-columns-tablet'], 2)
  assert.equal(raid50Config.style['--raid-columns-mobile'], 1)
})

test('RAID10 fits up to eight groups on wide screens and wraps responsively', () => {
  const config = getRaidGridConfig('RAID10', groups(10))

  assert.deepEqual(config.style, {
    '--raid-columns': 8,
    '--raid-columns-tablet': 4,
    '--raid-columns-mobile': 2
  })
  assert.equal(getRaidGridConfig('RAID10', groups(3)).style['--raid-columns'], 3)
})

test('other RAID modes keep their existing grid styles', () => {
  assert.deepEqual(getRaidGridConfig('RAID5', groups(1)), {
    className: '',
    style: undefined
  })
})
