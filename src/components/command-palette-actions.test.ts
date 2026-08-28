import { describe, expect, it } from 'bun:test'
import {
  createNavItems,
  moreNavItems,
  primaryNavItems,
} from '@/components/app-navbar-items'
import {
  buildCommandGroups,
  buildEntityCommandGroups,
  type CommandAction,
  matchesCommandQuery,
} from '@/components/command-palette-actions'

function flatten(
  groups: readonly { readonly items: readonly CommandAction[] }[],
) {
  return groups.flatMap((group) => group.items)
}

function findAction(label: string): CommandAction {
  const action = flatten(buildCommandGroups()).find(
    (candidate) => candidate.label === label,
  )
  if (!action) throw new Error(`No command action labelled "${label}"`)
  return action
}

describe('command palette actions', () => {
  it('reaches the dashboard and every navbar destination', () => {
    const targets = flatten(buildCommandGroups())
      .filter((action) => action.kind === 'navigate')
      .map((action) => action.to)

    expect(targets).toContain('/')
    for (const item of [...primaryNavItems, ...moreNavItems]) {
      expect(targets).toContain(item.url)
    }
  })

  it('offers the same create actions as the navbar', () => {
    const create = buildCommandGroups().find(
      (group) => group.label === 'Create',
    )

    expect(create?.items.map((action) => action.label)).toEqual(
      createNavItems.map((item) => item.title),
    )
  })

  it('drops create actions in demo mode but keeps navigation and themes', () => {
    const groups = buildCommandGroups({ demoMode: true })

    expect(groups.map((group) => group.label)).toEqual(['Go to', 'Appearance'])
    expect(flatten(groups).some((action) => action.kind === 'theme')).toBe(true)
  })

  it('has unique action values', () => {
    const values = flatten(buildCommandGroups()).map((action) => action.value)

    expect(new Set(values).size).toBe(values.length)
  })

  it('matches labels case- and whitespace-insensitively', () => {
    const beans = findAction('Beans')

    expect(matchesCommandQuery(beans, '  BEANS ')).toBe(true)
    expect(matchesCommandQuery(beans, 'roaster')).toBe(false)
  })

  it('matches keywords, including unaccented spellings', () => {
    expect(matchesCommandQuery(findAction('Cafés'), 'cafes')).toBe(true)
    expect(matchesCommandQuery(findAction('Statistics'), 'charts')).toBe(true)
    expect(matchesCommandQuery(findAction('Browser theme'), 'system')).toBe(
      true,
    )
  })

  it('matches every query term regardless of order', () => {
    const newBean = findAction('New bean')

    expect(matchesCommandQuery(newBean, 'bean new')).toBe(true)
    expect(matchesCommandQuery(newBean, 'new brew')).toBe(false)
  })

  it('keeps every action for a blank query', () => {
    const actions = flatten(buildCommandGroups())

    expect(actions.every((action) => matchesCommandQuery(action, '   '))).toBe(
      true,
    )
  })

  it('builds direct entity links with searchable metadata', () => {
    const groups = buildEntityCommandGroups({
      beans: [
        {
          id: 12,
          label: 'Worka Sakaro',
          description: 'April · Ethiopia',
          keywords: ['April', 'Ethiopia'],
        },
      ],
      cafes: [
        {
          id: 23,
          label: 'Kawa House',
          description: 'Berlin, Germany',
          keywords: ['Berlin', 'Germany'],
        },
      ],
      gear: [
        {
          id: 34,
          label: 'AeroPress Clear',
          description: 'brewer',
          keywords: ['AeroPress', 'Clear', 'brewer'],
        },
      ],
    })

    expect(groups.map((group) => group.label)).toEqual([
      'Beans',
      'Cafés',
      'Gear',
    ])
    const actions = flatten(groups)
    const targets = actions.flatMap((action) =>
      action.kind === 'navigate' ? [action.to] : [],
    )
    expect(targets).toEqual(['/beans/12', '/places/23', '/gear/34'])
    const [bean, cafe, gear] = actions
    if (!bean || !cafe || !gear) throw new Error('Missing entity actions')
    expect(matchesCommandQuery(bean, 'ethiopia bean')).toBe(true)
    expect(matchesCommandQuery(cafe, 'cafe berlin')).toBe(true)
    expect(matchesCommandQuery(gear, 'equipment clear')).toBe(true)
  })

  it('omits empty entity groups', () => {
    expect(
      buildEntityCommandGroups({ beans: [], cafes: [], gear: [] }),
    ).toEqual([])
  })
})
