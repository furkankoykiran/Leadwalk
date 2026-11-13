import { describe, expect, it } from 'vitest'
import { categoryIconName, categoryLabel, categoryOptionsList } from '../app/utils/category'

describe('categoryLabel', () => {
  it('maps a known Google place type to its localised label', () => {
    expect(categoryLabel('restaurant')).toBe('Restoran')
    expect(categoryLabel('pharmacy')).toBe('Eczane')
  })

  it('falls back to a generic label when the category is missing', () => {
    expect(categoryLabel(null)).toBe('Diğer')
  })

  it('localises common Google types that are display-only (not offered in discovery)', () => {
    expect(categoryLabel('gift_shop')).toBe('Hediyelik Eşya')
    expect(categoryLabel('yoga_studio')).toBe('Yoga Stüdyosu')
    expect(categoryLabel('consultant')).toBe('Danışmanlık')
    expect(categoryIconName('museum')).toBe('venue')
  })

  it('humanises unmapped types instead of showing the raw snake_case string', () => {
    expect(categoryLabel('vegan_restaurant')).toBe('Vegan Restaurant')
    expect(categoryLabel('spa')).toBe('Spa')
  })
})

describe('categoryIconName', () => {
  it('groups related types into the same icon bucket', () => {
    expect(categoryIconName('restaurant')).toBe('food')
    expect(categoryIconName('cafe')).toBe('food')
    expect(categoryIconName('bakery')).toBe('food')
  })

  it('falls back to the neutral building icon for null and unknown types', () => {
    expect(categoryIconName(null)).toBe('building')
    expect(categoryIconName('not_a_real_type')).toBe('building')
  })
})

describe('categoryOptionsList', () => {
  const options = categoryOptionsList()

  it('returns a non-empty list of value/label pairs', () => {
    expect(options.length).toBeGreaterThan(0)
    for (const option of options) {
      expect(option.value).toBeTruthy()
      expect(option.label).toBeTruthy()
    }
  })

  it('deduplicates aliases that share a label', () => {
    // hair_care and hair_salon both mean "Kuaför"; only one may be offered.
    const labels = options.map(o => o.label)
    expect(new Set(labels).size).toBe(labels.length)

    const values = options.map(o => o.value)
    expect(values).toContain('hair_care')
    expect(values).not.toContain('hair_salon')
  })

  it('sorts labels using Turkish collation', () => {
    const labels = options.map(o => o.label)
    const expected = [...labels].sort((a, b) => a.localeCompare(b, 'tr'))
    expect(labels).toEqual(expected)
  })

  it('does not offer display-only types as discovery filters', () => {
    const values = options.map(o => o.value)
    expect(values).not.toContain('gift_shop')
    expect(values).not.toContain('museum')
  })

  it('only offers values that resolve back to their own label', () => {
    for (const option of options) {
      expect(categoryLabel(option.value)).toBe(option.label)
    }
  })
})
