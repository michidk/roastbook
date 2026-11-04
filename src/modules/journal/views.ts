import type {
  JournalRow,
  JournalTable,
  JournalTables,
} from '@roastbook/journal-domain/model'
import { journalTableMetadata } from '@roastbook/journal-domain/model'

export type JournalDates<T> = {
  [K in keyof T]: K extends `${string}At` | `${string}Date` | `${string}From`
    ? T[K] extends string
      ? Date
      : T[K] extends string | null
        ? Date | null
        : T[K]
    : T[K]
}

export class JournalViews {
  constructor(readonly tables: JournalTables) {}
  row<T extends JournalTable>(
    table: T,
    row: JournalRow<T>,
  ): JournalDates<JournalRow<T>> {
    const dates = journalTableMetadata[table].dates
    // Dates are specified by the generated storage contract, not inferred from values.
    return Object.fromEntries(
      Object.entries(row).map(([key, value]) => [
        key,
        dates.includes(key) && typeof value === 'string'
          ? new Date(value)
          : value,
      ]),
    ) as JournalDates<JournalRow<T>>
  }
  all<T extends JournalTable>(table: T) {
    return this.tables[table].map((row) => this.row(table, row))
  }
  find<T extends JournalTable>(table: T, id: number | null | undefined) {
    const row = this.tables[table].find(
      (row) => Reflect.get(row, journalTableMetadata[table].primaryKey) === id,
    )
    return row ? this.row(table, row) : null
  }
  beans() {
    return this.all('beans').map((bean) => {
      const purchases = this.all('beanPurchases')
        .filter((purchase) => purchase.beanId === bean.id)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map((purchase) => ({
          ...purchase,
          shots: this.all('shots').filter(
            (shot) => shot.beanPurchaseId === purchase.id,
          ),
        }))
      const purchase =
        purchases.find((purchase) => !purchase.isArchived) ?? purchases[0]
      return {
        ...bean,
        roasterRef: this.find('roasters', bean.roasterId),
        images: this.all('beanImages').filter(
          (image) => image.beanId === bean.id,
        ),
        purchases,
        purchaseId: purchase?.id ?? null,
        roastDate: purchase?.roastDate ?? null,
        weight: purchase?.initialWeightGrams ?? null,
        price: purchase?.price ?? null,
        priceCurrency: purchase?.priceCurrency ?? null,
        shopName: purchase?.shopName ?? null,
        shopUrl: purchase?.shopUrl ?? null,
        isArchived:
          purchases.length > 0 &&
          purchases.every((purchase) => purchase.isArchived),
        usedWeightGrams: String(
          this.tables.shots
            .filter((shot) => shot.beanPurchaseId === purchase?.id)
            .reduce((sum, shot) => sum + Number(shot.doseGrams ?? 0), 0),
        ),
      }
    })
  }
  activePurchases() {
    const beans = this.beans()
    return this.all('beanPurchases')
      .filter((purchase) => !purchase.isArchived)
      .map((purchase) => {
        const bean = beans.find((bean) => bean.id === purchase.beanId)
        if (!bean)
          throw new Error('The local journal has an invalid bag relationship')
        return {
          ...bean,
          images: this.all('beanImages').filter(
            (image) => image.beanPurchaseId === purchase.id,
          ),
          purchaseId: purchase.id,
          roastDate: purchase.roastDate,
          weight: purchase.initialWeightGrams,
          price: purchase.price,
          priceCurrency: purchase.priceCurrency,
          shopName: purchase.shopName,
          shopUrl: purchase.shopUrl,
          isArchived: false,
          usedWeightGrams: String(
            this.tables.shots
              .filter((shot) => shot.beanPurchaseId === purchase.id)
              .reduce((sum, shot) => sum + Number(shot.doseGrams ?? 0), 0),
          ),
        }
      })
  }
  gear() {
    return this.all('gear').map((gear) => ({
      ...gear,
      images: this.all('gearImages').filter(
        (image) => image.gearId === gear.id,
      ),
      espressoMachineDetails: this.find('espressoMachineDetails', gear.id),
      grinderDetails: this.find('grinderDetails', gear.id),
      brewerDetails: this.find('brewerDetails', gear.id),
      kettleDetails: this.find('kettleDetails', gear.id),
      scaleDetails: this.find('scaleDetails', gear.id),
      tamperDetails: this.find('tamperDetails', gear.id),
      wdtDetails: this.find('wdtDetails', gear.id),
      basketDetails: this.find('basketDetails', gear.id),
      machineSettingRevisions: this.all('espressoMachineSettingRevisions')
        .filter((row) => row.gearId === gear.id)
        .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime()),
      propertyEvidence: this.all('gearPropertyEvidence').filter(
        (row) => row.gearId === gear.id,
      ),
    }))
  }
  methods() {
    return this.all('brewingMethods').map((method) => ({
      ...method,
      drinkTypeIds: this.tables.brewingMethodDrinkTypes
        .filter((row) => row.brewingMethodId === method.id)
        .map((row) => row.drinkTypeId),
    }))
  }
  recipes() {
    return this.all('recipes').map((recipe) => ({
      ...recipe,
      bean: this.beans().find((bean) => bean.id === recipe.beanId) ?? null,
      brewingMethod: this.find('brewingMethods', recipe.brewingMethodId),
      drinkType: this.find('drinkTypes', recipe.drinkTypeId),
      machine: this.find('gear', recipe.machineId),
      grinder: this.find('gear', recipe.grinderId),
      basket: this.find('gear', recipe.basketId),
      accessoryGearIds: this.tables.recipeAccessoryGear
        .filter((row) => row.recipeId === recipe.id)
        .map((row) => row.gearId),
      drinkOptions: this.all('recipeDrinkOptions')
        .filter((row) => row.recipeId === recipe.id)
        .map((row) => ({
          ...row,
          optionValue: this.optionValue(row.optionValueId),
        })),
    }))
  }
  shots() {
    const beans = this.beans()
    return this.all('shots').map((shot) => ({
      ...shot,
      bean: beans.find((bean) => bean.id === shot.beanId) ?? null,
      brewingMethod: this.find('brewingMethods', shot.brewingMethodId),
      drinkType: this.find('drinkTypes', shot.drinkTypeId),
      machine: this.find('gear', shot.machineId),
      grinder: this.find('gear', shot.grinderId),
      basket: this.find('gear', shot.basketId),
      machineSettingRevision: this.find(
        'espressoMachineSettingRevisions',
        shot.machineSettingRevisionId,
      ),
      accessoryGearIds: this.tables.shotAccessoryGear
        .filter((row) => row.shotId === shot.id)
        .map((row) => row.gearId),
      images: this.all('shotImages').filter((row) => row.shotId === shot.id),
      tasteTags: this.all('shotTasteTags')
        .filter((row) => row.shotId === shot.id)
        .map((row) => ({
          ...row,
          tasteTag: this.find('tasteTags', row.tasteTagId),
        })),
      drinkOptions: this.all('shotDrinkOptions')
        .filter((row) => row.shotId === shot.id)
        .map((row) => ({
          ...row,
          optionValue: this.optionValue(row.optionValueId),
        })),
    }))
  }
  optionValue(id: number) {
    const value = this.find('drinkOptionValues', id)
    return value
      ? { ...value, group: this.find('drinkOptionGroups', value.groupId) }
      : null
  }
  visits() {
    return this.all('cafeVisits').map((visit) => ({
      ...visit,
      coffeeShop: this.find('coffeeShops', visit.coffeeShopId),
      bean: this.find('beans', visit.beanId),
      drinkType: this.find('drinkTypes', visit.drinkTypeId),
      images: this.all('cafeVisitImages').filter(
        (row) => row.cafeVisitId === visit.id,
      ),
      tasteTags: this.all('cafeVisitTasteTags')
        .filter((row) => row.cafeVisitId === visit.id)
        .map((row) => ({
          ...row,
          tasteTag: this.find('tasteTags', row.tasteTagId),
        })),
      drinkOptions: this.all('cafeVisitDrinkOptions')
        .filter((row) => row.cafeVisitId === visit.id)
        .map((row) => ({
          ...row,
          optionValue: this.optionValue(row.optionValueId),
        })),
    }))
  }
  places() {
    return this.all('coffeeShops').map((place) => {
      const cafeVisits = this.visits()
        .filter((visit) => visit.coffeeShopId === place.id)
        .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
      const images = this.all('coffeeShopImages').filter(
        (row) => row.coffeeShopId === place.id,
      )
      return {
        ...place,
        images,
        cafeVisits,
        visitCount: cafeVisits.length,
        latestVisitAt: cafeVisits[0]?.visitedAt ?? null,
        imagePath: images[0]?.storagePath ?? null,
      }
    })
  }
  gearSets() {
    return this.all('gearSets').map((set) => {
      const accessoryGear = this.tables.gearSetAccessoryGear
        .filter((row) => row.gearSetId === set.id)
        .flatMap((row) => {
          const gear = this.find('gear', row.gearId)
          return gear ? [gear] : []
        })
      return {
        ...set,
        machine: this.find('gear', set.machineId),
        grinder: this.find('gear', set.grinderId),
        basket: this.find('gear', set.basketId),
        accessoryGear,
        accessoryGearIds: accessoryGear.map((gear) => gear.id),
      }
    })
  }
}
