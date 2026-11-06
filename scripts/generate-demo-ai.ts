import type { PgliteDatabase } from 'drizzle-orm/pglite'
import type * as schema from '@/db/schema'
import {
  SHOT_RECOMMENDATION_PARAMETER_KEYS,
  type ShotRecommendation,
} from '@/lib/shot-recommendation'
import { demoAiResponsesSchema } from '../packages/journal-demo/src/ai-responses'

/** Preset values and reasons for the settings the sample brews record. */
const KEEP_CONSTANT: Partial<
  Record<
    (typeof SHOT_RECOMMENDATION_PARAMETER_KEYS)[number],
    { readonly unit: string; readonly reason: string }
  >
> = {
  doseGrams: {
    unit: 'g',
    reason: 'A fixed [[doseGrams]] keeps strength comparable between brews.',
  },
  brewWaterGrams: {
    unit: 'g',
    reason:
      'The same [[brewWaterGrams]] keeps the ratio and strength comparable.',
  },
  yieldGrams: {
    unit: 'g',
    reason:
      'The same [[yieldGrams]] keeps the ratio comparable so taste differences reflect extraction.',
  },
  grindSetting: {
    unit: '',
    reason:
      'Changing [[grindSetting]] alongside anything else would hide which change mattered.',
  },
  targetTimeSeconds: {
    unit: 's',
    reason:
      'The same [[targetTimeSeconds]] shows whether the next brew flows faster or slower.',
  },
  brewTemperatureCelsius: {
    unit: '°C',
    reason:
      'Temperature shifts extraction on its own, so hold [[brewTemperatureCelsius]] while testing one variable.',
  },
}

/** Materialize canned answers while the sample database is available. No provider is used. */
export async function generateDemoAi(database: PgliteDatabase<typeof schema>) {
  const beans = await database.query.beans.findMany({
    with: { roasterRef: true },
  })
  const brews = await database.query.shots.findMany({
    with: {
      brewingMethod: true,
      machine: true,
      grinder: true,
      basket: true,
      accessoryGearLinks: { with: { gear: true } },
    },
  })
  brews.sort(
    (a, b) => b.brewedAt.getTime() - a.brewedAt.getTime() || b.id - a.id,
  )
  const setupKey = (brew: (typeof brews)[number]) =>
    JSON.stringify([
      brew.beanId,
      brew.brewingMethodId,
      brew.machineId,
      brew.grinderId,
      brew.basketId,
      brew.accessoryGearLinks.map((link) => link.gearId).sort((a, b) => a - b),
    ])
  return demoAiResponsesSchema.parse({
    beans: beans.map((bean) => ({
      id: bean.id,
      name: bean.name,
      fallback: {
        recommendation: {
          diagnosis: 'insufficient_evidence',
          confidence: 'low',
          headline: `Start a brew history for ${bean.name}`,
          reasoning: [
            `The sample journal has no brews for ${bean.name}.`,
            'Record a baseline [[doseGrams]], [[grindSetting]], and tasting notes before drawing conclusions about extraction.',
          ],
          historyInsight: `These sample beans are recorded as ${bean.roastLevel ?? 'an unspecified roast'} from ${bean.origin ?? 'an unspecified origin'}. There is no recorded brewing outcome to compare.`,
          changes: [],
          keepConstant: [],
          caveat:
            'Preset demo response. New brews and edits are not analyzed. No AI provider is contacted.',
          followUpQuestions: [
            'What should I record?',
            'How should I choose a starting recipe?',
            'How should I compare my next brew?',
          ],
        },
        basis: {
          beanName: bean.name,
          brewingMethodName: 'No sample brewing method',
          gearNames: [],
          matchingShotCount: 0,
          historyIncluded: 0,
          historyTruncated: false,
          focusedShotAt: null,
          latestShotAt: null,
        },
      },
      answers: [
        {
          blocks: [
            {
              type: 'text',
              text: 'Record the beans, brewing method, equipment, [[doseGrams]], [[grindSetting]], water or beverage weight, time, and [[brewTemperatureCelsius]] where your method supports them. Add a taste rating and notes.',
            },
          ],
        },
        {
          blocks: [
            {
              type: 'text',
              text: 'Use a simple recipe appropriate to your chosen brewing method. Treat it as a starting point to test, not as a result observed in this sample journal.',
            },
          ],
        },
        {
          blocks: [
            {
              type: 'text',
              text: 'Repeat the same recipe and equipment first. Compare sweetness, acidity, bitterness, and dryness, then change one variable at a time.',
            },
          ],
        },
      ],
      research: {
        name: bean.name,
        roaster: bean.roasterRef?.name ?? bean.roaster ?? '',
        origin: bean.origin ?? '',
        region: bean.region ?? '',
        process: bean.process ?? '',
        roastLevel: bean.roastLevel ?? '',
        notes: bean.notes ?? '',
      },
    })),
    brews: brews.map((brew) => {
      const bean = beans.find((bean) => bean.id === brew.beanId)
      if (!bean) throw new Error('Sample brew has no bean')
      const history = brews.filter(
        (other) => setupKey(other) === setupKey(brew),
      )
      const ratings = history.flatMap((other) =>
        other.rating === null ? [] : [other.rating],
      )
      const gearNames = [
        brew.machine?.name,
        brew.grinder?.name,
        brew.basket?.name,
        ...brew.accessoryGearLinks.map((link) => link.gear.name),
      ].filter((name): name is string => Boolean(name))
      // Newest first, so ties keep the most recent best-rated brew.
      const best = history.reduce((top, other) =>
        (other.rating ?? 0) > (top.rating ?? 0) ? other : top,
      )
      const changes: ShotRecommendation['changes'] =
        best.rating !== null &&
        best.rating > (brew.rating ?? 0) &&
        best.grindSetting !== null &&
        best.grindSetting !== brew.grindSetting
          ? [
              {
                parameter: 'grindSetting',
                currentValue: brew.grindSetting ?? 'Not set',
                recommendedValue: best.grindSetting,
                reason: `The best-rated matching brew (${best.rating}/5) used this [[grindSetting]]. Return to it and change nothing else.`,
              },
            ]
          : []
      const keepConstant: ShotRecommendation['keepConstant'] =
        SHOT_RECOMMENDATION_PARAMETER_KEYS.filter(
          (key) =>
            brew.brewingMethod.enabledParameters.includes(key) &&
            !changes.some((change) => change.parameter === key),
        )
          .flatMap((parameter) => {
            const value = brew[parameter]
            const preset = KEEP_CONSTANT[parameter]
            return value === null || !preset
              ? []
              : [
                  {
                    parameter,
                    currentValue: `${Number(value)} ${preset.unit}`.trim(),
                    reason: preset.reason,
                  },
                ]
          })
          .slice(0, 4)
      const recommendation: ShotRecommendation = {
        diagnosis: 'insufficient_evidence',
        confidence: 'low',
        headline: changes[0]
          ? `Return [[grindSetting]] to ${changes[0].recommendedValue}`
          : 'Repeat this brew unchanged',
        reasoning: [
          `This ${brew.brewingMethod.name} was rated ${brew.rating ?? 'not recorded'}${brew.rating === null ? '' : '/5'}.`,
          ...(changes[0]
            ? [
                `A matching brew at [[grindSetting]] ${changes[0].recommendedValue} was rated ${best.rating}/5.`,
                'Testing that setting with [[doseGrams]] and the rest of the recipe fixed shows whether the better result repeats.',
              ]
            : [
                'No matching brew was rated higher with a different [[grindSetting]].',
                'Repeating the recipe and recording sweetness, acidity, and bitterness gives a baseline before changing one variable.',
              ]),
        ],
        historyInsight: `${history.length} sample brews match these beans, method, and equipment.${ratings.length ? ` Their recorded overall ratings range from ${Math.min(...ratings)} to ${Math.max(...ratings)} out of 5.` : ' No overall ratings are recorded.'} Overall ratings alone do not identify an extraction problem.`,
        changes,
        keepConstant,
        caveat:
          'Preset demo response based on the original sample journal. Edits and new brews are not analyzed. No AI provider is contacted.',
        followUpQuestions: [
          changes[0]
            ? 'Why go back to that grind?'
            : 'Why should I repeat this recipe?',
          changes[0]
            ? 'Could I adjust the grind further?'
            : 'Could I adjust the grind instead?',
          'How should I compare my next brew?',
        ],
      }
      return {
        id: brew.id,
        beanId: bean.id,
        brewingMethodId: brew.brewingMethodId,
        setupKey: setupKey(brew),
        option: {
          historyShotId: brew.id,
          brewingMethodId: brew.brewingMethodId,
          brewingMethodName: brew.brewingMethod.name,
          setupName: gearNames.join(' · ') || 'No gear recorded',
        },
        result: {
          recommendation,
          basis: {
            beanName: bean.name,
            brewingMethodName: brew.brewingMethod.name,
            gearNames,
            matchingShotCount: history.length,
            historyIncluded: history.length,
            historyTruncated: false,
            focusedShotAt: brew.brewedAt,
            latestShotAt: history[0]?.brewedAt ?? brew.brewedAt,
          },
        },
        answers: [
          {
            blocks: [
              {
                type: 'text',
                text: changes[0]
                  ? `A matching ${bean.name} brew at [[grindSetting]] ${changes[0].recommendedValue} was rated ${best.rating}/5, higher than this brew's ${brew.rating ?? 'missing'} rating. Returning to it tests whether that result repeats. A rating alone cannot tell us whether to extract more or less.`
                  : `Repeating this ${bean.name} recipe gives you a comparison with the sample brew's recorded ${brew.rating ?? 'missing'} rating. A rating alone cannot tell us whether to extract more or less.`,
              },
            ],
          },
          {
            blocks: [
              {
                type: 'text',
                text: 'You can test a small [[grindSetting]] adjustment while keeping [[doseGrams]] and the other recipe settings fixed. Finer grinding generally increases extraction, but grinder scales differ. This preset does not infer a scale direction or a new numeric setting.',
              },
            ],
          },
          {
            blocks: [
              {
                type: 'text',
                text: 'Use the same beans, brewing method, and gear. Record an overall rating plus sweetness, acidity, bitterness, and any dryness. Compare the taste before making another change.',
              },
            ],
          },
        ],
      }
    }),
  })
}
