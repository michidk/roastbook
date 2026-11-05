import '@tanstack/react-start/server-only'

import { z } from 'zod'
import {
  beanPurchaseArchiveSchema,
  beanPurchaseCreateSchema,
  beanPurchaseUpdateSchema,
  createBeanPurchase,
  setBeanPurchaseArchived,
  updateBeanPurchase,
} from '@/journal/bean-purchases'
import {
  createBean,
  deleteBean,
  getBean,
  getBeanCollection,
  updateBean,
} from '@/journal/beans'
import {
  createBrewingMethod,
  deleteBrewingMethod,
  getBrewingMethod,
  getBrewingMethods,
  updateBrewingMethod,
} from '@/journal/brewing-methods'
import {
  createCafeVisit,
  deleteCafeVisit,
  getCafeVisit,
  getCafeVisitPage,
  updateCafeVisit,
} from '@/journal/cafe-visits'
import {
  createCoffeeShop,
  deleteCoffeeShop,
  getCoffeeShop,
  getCoffeeShopPage,
  updateCoffeeShop,
} from '@/journal/coffee-shops'
import {
  relatedShotListSchema,
  shotListSchema,
} from '@/journal/domain/shot-list-contract'
import {
  archiveDrinkOptionValue,
  archiveDrinkType,
  createDrinkOptionValue,
  getDrinkConfiguration,
  saveDrinkType,
} from '@/journal/drink-options'
import {
  createGear,
  deleteGear,
  getGearById,
  getGearPage,
  updateGear,
} from '@/journal/gear'
import {
  createGearSet,
  deleteGearSet,
  getGearSetById,
  getGearSetPage,
  updateGearSet,
} from '@/journal/gear-sets'
import {
  beanCreateSchema,
  beanListSchema,
  beanUpdateSchema,
} from '@/journal/input/beans'
import {
  brewingMethodUpdateSchema,
  brewingMethodWriteSchema,
} from '@/journal/input/brewing-methods'
import {
  cafeVisitListSchema,
  cafeVisitSchema,
  cafeVisitUpdateSchema,
} from '@/journal/input/cafe-visits'
import {
  coffeeShopCreateSchema,
  coffeeShopListSchema,
  coffeeShopUpdateSchema,
} from '@/journal/input/coffee-shops'
import {
  drinkTypeWriteSchema,
  optionValueWriteSchema,
} from '@/journal/input/drink-options'
import {
  gearCreateSchema,
  gearListSchema,
  gearUpdateSchema,
} from '@/journal/input/gear'
import {
  gearSetListSchema,
  gearSetUpdateSchema,
  gearSetWriteSchema,
} from '@/journal/input/gear-sets'
import {
  roasterCreateSchema,
  roasterListSchema,
  roasterUpdateSchema,
} from '@/journal/input/roasters'
import {
  createRecipe,
  deleteRecipe,
  getRecipe,
  getRecipePage,
  recipeListSchema,
  saveShotAsRecipe,
  updateRecipe,
} from '@/journal/recipes'
import {
  createRoaster,
  deleteRoaster,
  getRoaster,
  getRoasterPage,
  updateRoaster,
} from '@/journal/roasters'
import {
  createShot,
  deleteShot,
  getBeanShotAnalytics,
  getBeanShotPage,
  getGearShotPage,
  getShot,
  getShotPage,
  updateShot,
} from '@/journal/shots'
import { getDashboardStats, getDetailedStats } from '@/journal/stats'
import {
  createTasteTag,
  deleteTasteTag,
  getTasteTags,
} from '@/journal/taste-tags'
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { shotRecipeTargetSchema } from '@/lib/recipe-target'
import {
  positiveIdSchema,
  shotCreateSchema,
  shotUpdateSchema,
  tasteTagCreateSchema,
} from '@/lib/server-validation'
import { STATS_PERIOD_VALUES } from '@/lib/stats-filters'
import type {
  IntegrationAccess,
  IntegrationResource,
} from '@/modules/integrations/scopes'
import {
  deleteIntegrationImage,
  type IntegrationImage,
  imageDeleteSchema,
  imageReadSchema,
  imageThumbnailSchema,
  imageUploadSchema,
  readIntegrationImage,
  setIntegrationImageThumbnail,
  uploadIntegrationImage,
} from './images.server'
import { type IntegrationInput, integrationInput } from './input-schema.server'

export type IntegrationContext = {
  /** Throws unless the credential holds this scope. */
  require(resource: IntegrationResource, access: IntegrationAccess): void
}

export type IntegrationOperation = {
  /** Stable: MCP tool name, OpenAPI operationId and owner tool switch. */
  readonly name: string
  readonly title: string
  readonly description: string
  readonly access: IntegrationAccess
  /**
   * The resources the operation touches. With one, the scope is checked before
   * the operation runs; with several, the operation checks the one it uses.
   */
  readonly resources: readonly IntegrationResource[]
  readonly method: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  /** Path below `/api/v1`; `{name}` segments are taken from the input. */
  readonly path: string
  readonly input: IntegrationInput
  readonly run: (
    input: never,
    context: IntegrationContext,
  ) => Promise<unknown | IntegrationImage>
}

const id = z.object({ id: positiveIdSchema })
const empty = z.object({})
const statsFilter = z.object({
  period: z.enum(STATS_PERIOD_VALUES).optional(),
  method: positiveIdSchema.optional().describe('Brewing method id'),
  bean: positiveIdSchema.optional().describe('Bean id'),
  from: z.iso.date().optional().describe('YYYY-MM-DD, with period=custom'),
  to: z.iso.date().optional().describe('YYYY-MM-DD, with period=custom'),
})

function operation<S extends z.ZodType>(
  definition: Omit<IntegrationOperation, 'input' | 'run'> & {
    readonly input: S
    readonly run: (
      input: z.input<S>,
      context: IntegrationContext,
    ) => Promise<unknown>
  },
): IntegrationOperation {
  return {
    ...definition,
    input: integrationInput(definition.input),
    run: definition.run as IntegrationOperation['run'],
  }
}

type CrudOptions = {
  readonly resource: IntegrationResource
  readonly singular: string
  readonly plural: string
  readonly path: string
  readonly noun: string
}

/** The five standard operations for one journal collection. */
function crud<L extends z.ZodType, C extends z.ZodType, U extends z.ZodType>(
  options: CrudOptions,
  handlers: {
    list: { input: L; run: (input: z.input<L>) => Promise<unknown> }
    get: (id: number) => Promise<unknown>
    create: { input: C; run: (input: z.input<C>) => Promise<unknown> }
    update: { input: U; run: (input: z.input<U>) => Promise<unknown> }
    delete: (id: number) => Promise<unknown>
  },
) {
  const { resource, singular, plural, path, noun } = options
  return [
    operation({
      name: `list_${plural}`,
      title: `List ${noun}s`,
      description: `Page through your ${noun}s.`,
      access: 'read',
      resources: [resource],
      method: 'GET',
      path,
      input: handlers.list.input,
      run: handlers.list.run,
    }),
    operation({
      name: `get_${singular}`,
      title: `Get ${noun}`,
      description: `Read one ${noun} with its details.`,
      access: 'read',
      resources: [resource],
      method: 'GET',
      path: `${path}/{id}`,
      input: id,
      run: (input) => handlers.get(input.id),
    }),
    operation({
      name: `create_${singular}`,
      title: `Create ${noun}`,
      description: `Add a ${noun} to your journal.`,
      access: 'write',
      resources: [resource],
      method: 'POST',
      path,
      input: handlers.create.input,
      run: handlers.create.run,
    }),
    operation({
      name: `update_${singular}`,
      title: `Update ${noun}`,
      description: `Replace the editable fields of a ${noun}.`,
      access: 'write',
      resources: [resource],
      method: 'PATCH',
      path: `${path}/{id}`,
      input: handlers.update.input,
      run: handlers.update.run,
    }),
    operation({
      name: `delete_${singular}`,
      title: `Delete ${noun}`,
      description: `Delete a ${noun} and its pictures.`,
      access: 'write',
      resources: [resource],
      method: 'DELETE',
      path: `${path}/{id}`,
      input: id,
      run: (input) => handlers.delete(input.id),
    }),
  ]
}

/**
 * Everything an integration can do, shared by `/api/v1` and MCP. Operations
 * call the same journal functions as the app, inside the owner's journal
 * scope, so row-level security limits them to the credential owner's data.
 * Account, credential, sign-in and instance settings are deliberately absent.
 */
export const INTEGRATION_OPERATIONS: readonly IntegrationOperation[] = [
  ...crud(
    {
      resource: 'brews',
      singular: 'brew',
      plural: 'brews',
      path: '/brews',
      noun: 'brew',
    },
    {
      list: {
        input: shotListSchema,
        run: (data) => getShotPage({ data }),
      },
      get: (data) => getShot({ data }),
      create: {
        input: shotCreateSchema,
        run: (data) => createShot({ data }),
      },
      update: {
        input: shotUpdateSchema,
        run: (data) => updateShot({ data }),
      },
      delete: (data) => deleteShot({ data }),
    },
  ),
  operation({
    name: 'list_bean_brews',
    title: 'List brews of a bean',
    description: 'Page through the brews made with one bean.',
    access: 'read',
    resources: ['brews'],
    method: 'GET',
    path: '/beans/{entityId}/brews',
    input: relatedShotListSchema,
    run: (data) => getBeanShotPage({ data }),
  }),
  operation({
    name: 'get_bean_brew_analytics',
    title: 'Get bean brew analytics',
    description: 'Ratings and recipe trends of the brews made with one bean.',
    access: 'read',
    resources: ['brews'],
    method: 'GET',
    path: '/beans/{id}/analytics',
    input: id,
    run: ({ id }) => getBeanShotAnalytics({ data: id }),
  }),
  operation({
    name: 'list_gear_brews',
    title: 'List brews made with gear',
    description: 'Page through the brews made with one piece of equipment.',
    access: 'read',
    resources: ['brews'],
    method: 'GET',
    path: '/gear/{entityId}/brews',
    input: relatedShotListSchema,
    run: (data) => getGearShotPage({ data }),
  }),
  operation({
    name: 'save_brew_as_recipe',
    title: 'Save brew as recipe',
    description:
      'Store a brew’s parameters as a new recipe (name) or update one (recipeId).',
    access: 'write',
    resources: ['recipes'],
    method: 'POST',
    path: '/brews/{shotId}/recipe',
    input: shotRecipeTargetSchema,
    run: (data, context) => {
      // The recipe copies the brew's parameters.
      context.require('brews', 'read')
      return saveShotAsRecipe({ data })
    },
  }),

  ...crud(
    {
      resource: 'beans',
      singular: 'bean',
      plural: 'beans',
      path: '/beans',
      noun: 'bean',
    },
    {
      list: {
        input: beanListSchema,
        run: (data) => getBeanCollection({ data }),
      },
      get: (data) => getBean({ data }),
      create: { input: beanCreateSchema, run: (data) => createBean({ data }) },
      update: { input: beanUpdateSchema, run: (data) => updateBean({ data }) },
      delete: (data) => deleteBean({ data }),
    },
  ),
  operation({
    name: 'create_bean_purchase',
    title: 'Add bean purchase',
    description: 'Record a bag of an existing bean.',
    access: 'write',
    resources: ['beans'],
    method: 'POST',
    path: '/beans/{beanId}/purchases',
    input: beanPurchaseCreateSchema,
    run: (data) => createBeanPurchase({ data }),
  }),
  operation({
    name: 'update_bean_purchase',
    title: 'Update bean purchase',
    description: 'Replace the editable fields of a bag.',
    access: 'write',
    resources: ['beans'],
    method: 'PATCH',
    path: '/beans/{beanId}/purchases/{id}',
    input: beanPurchaseUpdateSchema,
    run: (data) => updateBeanPurchase({ data }),
  }),
  operation({
    name: 'archive_bean_purchase',
    title: 'Archive bean purchase',
    description: 'Archive a finished bag, or restore it.',
    access: 'write',
    resources: ['beans'],
    method: 'POST',
    path: '/beans/{beanId}/purchases/{id}/archive',
    input: beanPurchaseArchiveSchema,
    run: (data) => setBeanPurchaseArchived({ data }),
  }),

  ...crud(
    {
      resource: 'roasters',
      singular: 'roaster',
      plural: 'roasters',
      path: '/roasters',
      noun: 'roaster',
    },
    {
      list: {
        input: roasterListSchema,
        run: (data) => getRoasterPage({ data }),
      },
      get: (data) => getRoaster({ data }),
      create: {
        input: roasterCreateSchema,
        run: (data) => createRoaster({ data }),
      },
      update: {
        input: roasterUpdateSchema,
        run: (data) => updateRoaster({ data }),
      },
      delete: (data) => deleteRoaster({ data }),
    },
  ),

  ...crud(
    {
      resource: 'gear',
      singular: 'gear',
      plural: 'gear',
      path: '/gear',
      noun: 'gear item',
    },
    {
      list: { input: gearListSchema, run: (data) => getGearPage({ data }) },
      get: (data) => getGearById({ data }),
      create: { input: gearCreateSchema, run: (data) => createGear({ data }) },
      update: { input: gearUpdateSchema, run: (data) => updateGear({ data }) },
      delete: (data) => deleteGear({ data }),
    },
  ),
  ...crud(
    {
      resource: 'gear',
      singular: 'gear_set',
      plural: 'gear_sets',
      path: '/gear-sets',
      noun: 'gear set',
    },
    {
      list: {
        input: gearSetListSchema,
        run: (data) => getGearSetPage({ data }),
      },
      get: (data) => getGearSetById({ data }),
      create: {
        input: gearSetWriteSchema,
        run: (data) => createGearSet({ data }),
      },
      update: {
        input: gearSetUpdateSchema,
        run: (data) => updateGearSet({ data }),
      },
      delete: (data) => deleteGearSet({ data }),
    },
  ),

  ...crud(
    {
      resource: 'recipes',
      singular: 'recipe',
      plural: 'recipes',
      path: '/recipes',
      noun: 'recipe',
    },
    {
      list: {
        input: recipeListSchema,
        run: (data) => getRecipePage({ data }),
      },
      get: (data) => getRecipe({ data }),
      create: {
        input: recipeCreateSchema,
        run: (data) => createRecipe({ data }),
      },
      update: {
        input: recipeUpdateSchema,
        run: (data) => updateRecipe({ data }),
      },
      delete: (data) => deleteRecipe({ data }),
    },
  ),

  ...crud(
    {
      resource: 'places',
      singular: 'place',
      plural: 'places',
      path: '/places',
      noun: 'place',
    },
    {
      list: {
        input: coffeeShopListSchema,
        run: (data) => getCoffeeShopPage({ data }),
      },
      get: (data) => getCoffeeShop({ data }),
      create: {
        input: coffeeShopCreateSchema,
        run: (data) => createCoffeeShop({ data }),
      },
      update: {
        input: coffeeShopUpdateSchema,
        run: (data) => updateCoffeeShop({ data }),
      },
      delete: (data) => deleteCoffeeShop({ data }),
    },
  ),

  ...crud(
    {
      resource: 'visits',
      singular: 'visit',
      plural: 'visits',
      path: '/visits',
      noun: 'café visit',
    },
    {
      list: {
        input: cafeVisitListSchema,
        run: (data) => getCafeVisitPage({ data }),
      },
      get: (data) => getCafeVisit({ data }),
      create: {
        input: cafeVisitSchema,
        run: (data) => createCafeVisit({ data }),
      },
      update: {
        input: cafeVisitUpdateSchema,
        run: (data) => updateCafeVisit({ data }),
      },
      delete: (data) => deleteCafeVisit({ data }),
    },
  ),

  operation({
    name: 'list_brewing_methods',
    title: 'List brewing methods',
    description:
      'List brewing methods with their drink types. Use their ids when logging a brew.',
    access: 'read',
    resources: ['methods'],
    method: 'GET',
    path: '/brewing-methods',
    input: empty,
    run: () => getBrewingMethods(),
  }),
  operation({
    name: 'get_brewing_method',
    title: 'Get brewing method',
    description: 'Read one brewing method with its parameters.',
    access: 'read',
    resources: ['methods'],
    method: 'GET',
    path: '/brewing-methods/{id}',
    input: id,
    run: ({ id }) => getBrewingMethod({ data: id }),
  }),
  operation({
    name: 'create_brewing_method',
    title: 'Create brewing method',
    description: 'Add a brewing method.',
    access: 'write',
    resources: ['methods'],
    method: 'POST',
    path: '/brewing-methods',
    input: brewingMethodWriteSchema,
    run: (data) => createBrewingMethod({ data }),
  }),
  operation({
    name: 'update_brewing_method',
    title: 'Update brewing method',
    description: 'Replace the editable fields of a brewing method.',
    access: 'write',
    resources: ['methods'],
    method: 'PATCH',
    path: '/brewing-methods/{id}',
    input: brewingMethodUpdateSchema,
    run: (data) => updateBrewingMethod({ data }),
  }),
  operation({
    name: 'delete_brewing_method',
    title: 'Delete brewing method',
    description: 'Delete a brewing method that no brew uses.',
    access: 'write',
    resources: ['methods'],
    method: 'DELETE',
    path: '/brewing-methods/{id}',
    input: id,
    run: ({ id }) => deleteBrewingMethod({ data: id }),
  }),
  operation({
    name: 'get_drink_configuration',
    title: 'Get drinks',
    description: 'List drink types, option groups and option values.',
    access: 'read',
    resources: ['methods'],
    method: 'GET',
    path: '/drinks',
    input: empty,
    run: () => getDrinkConfiguration(),
  }),
  operation({
    name: 'save_drink_type',
    title: 'Save drink type',
    description: 'Create a drink type, or update it when an id is given.',
    access: 'write',
    resources: ['methods'],
    method: 'POST',
    path: '/drinks/types',
    input: drinkTypeWriteSchema,
    run: (data) => saveDrinkType({ data }),
  }),
  operation({
    name: 'archive_drink_type',
    title: 'Archive drink type',
    description: 'Hide a drink type from new brews.',
    access: 'write',
    resources: ['methods'],
    method: 'POST',
    path: '/drinks/types/{id}/archive',
    input: id,
    run: ({ id }) => archiveDrinkType({ data: id }),
  }),
  operation({
    name: 'create_drink_option',
    title: 'Create drink option',
    description: 'Add a value to a drink option group, such as a milk type.',
    access: 'write',
    resources: ['methods'],
    method: 'POST',
    path: '/drinks/options',
    input: optionValueWriteSchema,
    run: (data) => createDrinkOptionValue({ data }),
  }),
  operation({
    name: 'archive_drink_option',
    title: 'Archive drink option',
    description: 'Hide a drink option value from new brews.',
    access: 'write',
    resources: ['methods'],
    method: 'POST',
    path: '/drinks/options/{id}/archive',
    input: id,
    run: ({ id }) => archiveDrinkOptionValue({ data: id }),
  }),

  operation({
    name: 'list_taste_tags',
    title: 'List taste tags',
    description: 'List the taste tags available for brews and visits.',
    access: 'read',
    resources: ['tags'],
    method: 'GET',
    path: '/taste-tags',
    input: empty,
    run: () => getTasteTags(),
  }),
  operation({
    name: 'create_taste_tag',
    title: 'Create taste tag',
    description: 'Add a taste tag.',
    access: 'write',
    resources: ['tags'],
    method: 'POST',
    path: '/taste-tags',
    input: tasteTagCreateSchema,
    run: (data) => createTasteTag({ data }),
  }),
  operation({
    name: 'delete_taste_tag',
    title: 'Delete taste tag',
    description: 'Delete a taste tag and remove it from brews and visits.',
    access: 'write',
    resources: ['tags'],
    method: 'DELETE',
    path: '/taste-tags/{id}',
    input: id,
    run: ({ id }) => deleteTasteTag({ data: id }),
  }),

  operation({
    name: 'get_stats',
    title: 'Get statistics',
    description:
      'Brewing statistics for a period, optionally for one method or bean.',
    access: 'read',
    resources: ['stats'],
    method: 'GET',
    path: '/stats',
    input: statsFilter,
    run: (data) => getDetailedStats({ data }),
  }),
  operation({
    name: 'get_dashboard',
    title: 'Get dashboard',
    description: 'The overview numbers shown on the dashboard.',
    access: 'read',
    resources: ['stats'],
    method: 'GET',
    path: '/stats/dashboard',
    input: empty,
    run: () => getDashboardStats(),
  }),

  operation({
    name: 'get_image',
    title: 'Get picture',
    description:
      'Download a picture by the storagePath of an image record, as the original or a smaller size.',
    access: 'read',
    resources: ['brews', 'beans', 'gear', 'places', 'visits'],
    method: 'GET',
    path: '/images',
    input: imageReadSchema,
    run: readIntegrationImage,
  }),
  operation({
    name: 'upload_image',
    title: 'Upload picture',
    description:
      'Attach a JPEG, PNG, WebP or GIF picture (base64 data) to a brew, bag, gear item, place or visit.',
    access: 'write',
    resources: ['brews', 'beans', 'gear', 'places', 'visits'],
    method: 'POST',
    path: '/images',
    input: imageUploadSchema,
    run: uploadIntegrationImage,
  }),
  operation({
    name: 'set_image_thumbnail',
    title: 'Use picture as thumbnail',
    description: 'Show this picture first for a bag or gear item.',
    access: 'write',
    resources: ['beans', 'gear'],
    method: 'POST',
    path: '/images/{entityType}/{entityId}/{imageId}/thumbnail',
    input: imageThumbnailSchema,
    run: setIntegrationImageThumbnail,
  }),
  operation({
    name: 'delete_image',
    title: 'Delete picture',
    description:
      'Delete a picture from a brew, bag, gear item, place or visit.',
    access: 'write',
    resources: ['brews', 'beans', 'gear', 'places', 'visits'],
    method: 'DELETE',
    path: '/images/{entityType}/{entityId}/{imageId}',
    input: imageDeleteSchema,
    run: deleteIntegrationImage,
  }),
]

const byName = new Map(
  INTEGRATION_OPERATIONS.map((operation) => [operation.name, operation]),
)

export function getIntegrationOperation(name: string) {
  return byName.get(name)
}

export const INTEGRATION_OPERATION_NAMES = INTEGRATION_OPERATIONS.map(
  (operation) => operation.name,
)
