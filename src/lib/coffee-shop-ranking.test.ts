import { describe, expect, it } from "vitest"
import {
  getFeaturedCoffeeShops,
  sortCoffeeShopsByFavoriteAndLastVisit,
} from "./coffee-shop-ranking"

describe("getFeaturedCoffeeShops", () => {
  it("pins favorites before recent places and orders both by latest visit", () => {
    // Given
    const coffeeShops = [
      { id: 1, name: "Older favorite", isFavorite: true },
      { id: 2, name: "Newer favorite", isFavorite: true },
      { id: 3, name: "Older recent", isFavorite: false },
      { id: 4, name: "Newest recent", isFavorite: false },
      { id: 5, name: "Unvisited", isFavorite: false },
      { id: 6, name: "Unvisited favorite", isFavorite: true },
    ] as const
    const visits = [
      { coffeeShopId: 1, visitedAt: new Date("2026-07-01T08:00:00Z") },
      { coffeeShopId: 2, visitedAt: new Date("2026-08-01T08:00:00Z") },
      { coffeeShopId: 3, visitedAt: new Date("2026-06-01T08:00:00Z") },
      { coffeeShopId: 4, visitedAt: new Date("2026-08-02T08:00:00Z") },
      { coffeeShopId: 3, visitedAt: new Date("2026-07-15T08:00:00Z") },
    ] as const

    // When
    const featured = getFeaturedCoffeeShops(coffeeShops, visits, 2)

    // Then
    expect(featured.map((coffeeShop) => coffeeShop.id)).toEqual([
      2,
      1,
      6,
      4,
      3,
    ])
  })
})

describe("sortCoffeeShopsByFavoriteAndLastVisit", () => {
  it("keeps favorites first and orders each category by latest logged visit", () => {
    // Given
    const coffeeShops = [
      { id: 1, name: "Older favorite", isFavorite: true },
      { id: 2, name: "Newer regular", isFavorite: false },
      { id: 3, name: "Never visited favorite", isFavorite: true },
      { id: 4, name: "Newer favorite", isFavorite: true },
      { id: 5, name: "Older regular", isFavorite: false },
      { id: 6, name: "Never visited regular", isFavorite: false },
    ] as const
    const visits = [
      { coffeeShopId: 1, visitedAt: new Date("2026-07-01T08:00:00Z") },
      { coffeeShopId: 2, visitedAt: new Date("2026-08-02T08:00:00Z") },
      { coffeeShopId: 4, visitedAt: new Date("2026-08-03T08:00:00Z") },
      { coffeeShopId: 5, visitedAt: new Date("2026-06-01T08:00:00Z") },
    ] as const

    // When
    const sorted = sortCoffeeShopsByFavoriteAndLastVisit(coffeeShops, visits)

    // Then
    expect(sorted.map((coffeeShop) => coffeeShop.id)).toEqual([4, 1, 3, 2, 5, 6])
  })
})
