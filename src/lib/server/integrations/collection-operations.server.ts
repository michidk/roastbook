import '@tanstack/react-start/server-only'

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
import { recipeCreateSchema, recipeUpdateSchema } from '@/lib/recipe-input'
import { shotRecipeTargetSchema } from '@/lib/recipe-target'
import { shotCreateSchema, shotUpdateSchema } from '@/lib/server-validation'

import { crud, id, operation } from './operation.server'

/** Journal collections: brews, beans, roasters, gear, recipes, places, visits. */
export const COLLECTION_OPERATIONS = [
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
    // The recipe copies the brew's parameters.
    alsoRequires: ['brews:read'],
    method: 'POST',
    path: '/brews/{shotId}/recipe',
    input: shotRecipeTargetSchema,
    run: (data) => saveShotAsRecipe({ data }),
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
]
