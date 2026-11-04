import * as remote from '@/lib/server/coffee-shops'
import { journalRead, journalWrite } from '../journal-function'
export const getCoffeeShops = journalRead(
  remote.getCoffeeShops,
  'coffee-shops/getCoffeeShops',
)
export const getCoffeeShopMapOverview = journalRead(
  remote.getCoffeeShopMapOverview,
  'coffee-shops/getCoffeeShopMapOverview',
)
export const getCoffeeShopPage = journalRead(
  remote.getCoffeeShopPage,
  'coffee-shops/getCoffeeShopPage',
)
export const getCoffeeShop = journalRead(
  remote.getCoffeeShop,
  'coffee-shops/getCoffeeShop',
)
export const createCoffeeShop = journalWrite(
  remote.createCoffeeShop,
  'coffee-shops/createCoffeeShop',
)
export const updateCoffeeShop = journalWrite(
  remote.updateCoffeeShop,
  'coffee-shops/updateCoffeeShop',
)
export const deleteCoffeeShop = journalWrite(
  remote.deleteCoffeeShop,
  'coffee-shops/deleteCoffeeShop',
)
