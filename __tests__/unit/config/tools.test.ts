import { describe, it, expect } from 'vitest'
import {
  tools,
  getToolsByCategory,
  getToolBySlug,
  CATEGORY_LABELS,
  CATEGORIES,
  type Tool,
  type ToolCategory,
} from '@/config/tools'

describe('Tool Registry', () => {
  describe('tools array', () => {
    it('has exactly 32 tools', () => {
      expect(tools).toHaveLength(32)
    })

    it('has no duplicate slugs', () => {
      const slugs = tools.map((t) => t.slug)
      const unique = new Set(slugs)
      expect(unique.size).toBe(tools.length)
    })

    it('every tool has all required fields with non-empty values', () => {
      const requiredStringFields: (keyof Tool)[] = [
        'slug',
        'name',
        'description',
        'category',
        'icon',
        'processingMode',
      ]
      for (const tool of tools) {
        for (const field of requiredStringFields) {
          expect(
            tool[field],
            `tool "${tool.slug}" is missing field "${field}"`
          ).toBeTruthy()
        }
        expect(
          typeof tool.multiple,
          `tool "${tool.slug}" field "multiple" should be boolean`
        ).toBe('boolean')
        expect(
          tool.maxFiles,
          `tool "${tool.slug}" field "maxFiles" should exist`
        ).toBeDefined()
        expect(
          tool.maxSizeMB,
          `tool "${tool.slug}" field "maxSizeMB" should exist`
        ).toBeDefined()
        expect(
          tool.acceptedFormats,
          `tool "${tool.slug}" field "acceptedFormats" should exist`
        ).toBeDefined()
      }
    })

    it('all maxSizeMB values are positive numbers', () => {
      for (const tool of tools) {
        expect(tool.maxSizeMB, `tool "${tool.slug}" maxSizeMB should be positive`).toBeGreaterThan(0)
        expect(typeof tool.maxSizeMB).toBe('number')
      }
    })

    it('all maxFiles values are positive integers', () => {
      for (const tool of tools) {
        expect(tool.maxFiles, `tool "${tool.slug}" maxFiles should be positive`).toBeGreaterThan(0)
        expect(Number.isInteger(tool.maxFiles)).toBe(true)
      }
    })

    it('acceptedFormats is non-empty for every tool', () => {
      for (const tool of tools) {
        expect(
          tool.acceptedFormats.length,
          `tool "${tool.slug}" should have at least one accepted format`
        ).toBeGreaterThan(0)
      }
    })

    it('all processingMode values are valid', () => {
      const valid = new Set<string>(['client', 'server', 'ai'])
      for (const tool of tools) {
        expect(valid.has(tool.processingMode), `tool "${tool.slug}" has invalid processingMode "${tool.processingMode}"`).toBe(true)
      }
    })

    it('all icon values are non-empty valid identifier strings', () => {
      const validIdentifier = /^[A-Z][a-zA-Z0-9]*$/
      for (const tool of tools) {
        expect(tool.icon, `tool "${tool.slug}" has empty icon`).toBeTruthy()
        expect(validIdentifier.test(tool.icon), `tool "${tool.slug}" has invalid icon format "${tool.icon}"`).toBe(true)
      }
    })
  })

  describe('category distribution', () => {
    it('all 7 categories have at least one tool', () => {
      for (const category of CATEGORIES) {
        const categoryTools = tools.filter((t) => t.category === category)
        expect(
          categoryTools.length,
          `category "${category}" should have at least one tool`
        ).toBeGreaterThan(0)
      }
    })

    it('organize category has exactly 6 tools', () => {
      const organizeTools = tools.filter((t) => t.category === 'organize')
      expect(organizeTools).toHaveLength(6)
    })

    it('intelligence category has exactly 3 tools', () => {
      const intelligenceTools = tools.filter((t) => t.category === 'intelligence')
      expect(intelligenceTools).toHaveLength(3)
    })
  })

  describe('getToolsByCategory', () => {
    it('returns correct tools for organize category', () => {
      const result = getToolsByCategory('organize')
      expect(result.every((t) => t.category === 'organize')).toBe(true)
      expect(result).toHaveLength(6)
    })

    it('returns correct tools for optimize category', () => {
      const result = getToolsByCategory('optimize')
      expect(result.every((t) => t.category === 'optimize')).toBe(true)
      expect(result).toHaveLength(3)
    })

    it('returns correct tools for convert-to category', () => {
      const result = getToolsByCategory('convert-to')
      expect(result.every((t) => t.category === 'convert-to')).toBe(true)
      expect(result).toHaveLength(5)
    })

    it('returns correct tools for convert-from category', () => {
      const result = getToolsByCategory('convert-from')
      expect(result.every((t) => t.category === 'convert-from')).toBe(true)
      expect(result).toHaveLength(5)
    })

    it('returns correct tools for edit category', () => {
      const result = getToolsByCategory('edit')
      expect(result.every((t) => t.category === 'edit')).toBe(true)
      expect(result).toHaveLength(5)
    })

    it('returns correct tools for security category', () => {
      const result = getToolsByCategory('security')
      expect(result.every((t) => t.category === 'security')).toBe(true)
      expect(result).toHaveLength(5)
    })

    it('returns correct tools for intelligence category', () => {
      const result = getToolsByCategory('intelligence')
      expect(result.every((t) => t.category === 'intelligence')).toBe(true)
      expect(result).toHaveLength(3)
    })
  })

  describe('getToolBySlug', () => {
    it('returns the correct tool for merge-pdf', () => {
      const tool = getToolBySlug('merge-pdf')
      expect(tool).toBeDefined()
      expect(tool?.slug).toBe('merge-pdf')
      expect(tool?.name).toBe('Merge PDF')
      expect(tool?.category).toBe('organize')
    })

    it('returns undefined for a nonexistent slug', () => {
      const tool = getToolBySlug('nonexistent')
      expect(tool).toBeUndefined()
    })
  })

  describe('CATEGORY_LABELS', () => {
    it('has a label for every category', () => {
      for (const category of CATEGORIES) {
        expect(CATEGORY_LABELS[category]).toBeTruthy()
      }
    })

    it('has correct labels', () => {
      expect(CATEGORY_LABELS['organize']).toBe('Organize PDF')
      expect(CATEGORY_LABELS['optimize']).toBe('Optimize PDF')
      expect(CATEGORY_LABELS['convert-to']).toBe('Convert to PDF')
      expect(CATEGORY_LABELS['convert-from']).toBe('Convert from PDF')
      expect(CATEGORY_LABELS['edit']).toBe('Edit PDF')
      expect(CATEGORY_LABELS['security']).toBe('PDF Security')
      expect(CATEGORY_LABELS['intelligence']).toBe('PDF Intelligence')
    })
  })

  describe('CATEGORIES', () => {
    it('contains all 7 categories in the correct order', () => {
      expect(CATEGORIES).toEqual([
        'organize',
        'optimize',
        'convert-to',
        'convert-from',
        'edit',
        'security',
        'intelligence',
      ])
    })
  })
})
