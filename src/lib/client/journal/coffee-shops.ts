import * as remote from '@/lib/server/coffee-shops'
import { journalFunction } from '../journal-function'
export const getCoffeeShops = journalFunction(
  remote.getCoffeeShops,
  'coffee-shops/getCoffeeShops',
  false,
)
export const getCoffeeShopMapOverview = journalFunction(
  remote.getCoffeeShopMapOverview,
  'coffee-shops/getCoffeeShopMapOverview',
  false,
)
export const getCoffeeShopPage = journalFunction(
  remote.getCoffeeShopPage,
  'coffee-shops/getCoffeeShopPage',
  false,
)
export const getCoffeeShop = journalFunction(
  remote.getCoffeeShop,
  'coffee-shops/getCoffeeShop',
  false,
)
export const createCoffeeShop = journalFunction(
  remote.createCoffeeShop,
  'coffee-shops/createCoffeeShop',
  true,
)
export const updateCoffeeShop = journalFunction(
  remote.updateCoffeeShop,
  'coffee-shops/updateCoffeeShop',
  true,
)
export const deleteCoffeeShop = journalFunction(
  remote.deleteCoffeeShop,
  'coffee-shops/deleteCoffeeShop',
  true,
)
