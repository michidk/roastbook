import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import { mkdir, copyFile, stat } from "node:fs/promises"
import { join, dirname } from "node:path"
import * as schema from "../src/db/schema"

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  console.error("DATABASE_URL environment variable is required")
  process.exit(1)
}

const client = postgres(connectionString)
const db = drizzle(client, { schema })

const GEAR = [
  {
    name: "Breville Barista Express",
    brand: "Breville",
    model: "BES870XL",
    type: "espresso_machine" as const,
    image_filename: "breville-barista-express.webp",
    image_source: "/tmp/opencode/breville-barista-express.webp",
    notes: "Integrated grinder, 15 bar pump, PID temperature control",
  },
]

const TASTE_TAGS = [
  { name: "Fruity", category: "Flavor", extractionAxis: "0.3", strengthAxis: "0.5" },
  { name: "Citrus", category: "Flavor", extractionAxis: "0.4", strengthAxis: "0.4" },
  { name: "Berry", category: "Flavor", extractionAxis: "0.3", strengthAxis: "0.5" },
  { name: "Chocolate", category: "Flavor", extractionAxis: "0.6", strengthAxis: "0.7" },
  { name: "Nutty", category: "Flavor", extractionAxis: "0.5", strengthAxis: "0.6" },
  { name: "Caramel", category: "Flavor", extractionAxis: "0.6", strengthAxis: "0.6" },
  { name: "Floral", category: "Flavor", extractionAxis: "0.2", strengthAxis: "0.3" },
  { name: "Honey", category: "Flavor", extractionAxis: "0.5", strengthAxis: "0.5" },
  { name: "Spicy", category: "Flavor", extractionAxis: "0.7", strengthAxis: "0.6" },
  { name: "Earthy", category: "Flavor", extractionAxis: "0.7", strengthAxis: "0.7" },
  { name: "Bright", category: "Acidity", extractionAxis: "0.2", strengthAxis: "0.3" },
  { name: "Crisp", category: "Acidity", extractionAxis: "0.3", strengthAxis: "0.4" },
  { name: "Mellow", category: "Acidity", extractionAxis: "0.6", strengthAxis: "0.5" },
  { name: "Sour", category: "Defect", extractionAxis: "0.1", strengthAxis: "0.3" },
  { name: "Bitter", category: "Defect", extractionAxis: "0.9", strengthAxis: "0.8" },
  { name: "Astringent", category: "Defect", extractionAxis: "0.8", strengthAxis: "0.7" },
  { name: "Syrupy", category: "Body", extractionAxis: "0.6", strengthAxis: "0.8" },
  { name: "Creamy", category: "Body", extractionAxis: "0.5", strengthAxis: "0.7" },
  { name: "Thin", category: "Body", extractionAxis: "0.3", strengthAxis: "0.2" },
  { name: "Full", category: "Body", extractionAxis: "0.6", strengthAxis: "0.8" },
]

type RoastLevel = "light" | "medium_light" | "medium" | "medium_dark" | "dark"

interface ImportedBean {
  id: number
  image_filename: string
  roaster: string | null
  name: string
  origin: string | null
  region: string | null
  farm: string | null
  variety: string | null
  process: string | null
  roast_date: string | null
  roast_level: RoastLevel | null
  tasting_notes: string | null
  notes: string | null
}

interface ImportedShot {
  bean_id: number
  image_filename: string
  dose_grams: number | null
  grind_setting: string | null
  basket: string | null
  brew_time_seconds: number | null
  yield_grams: number | null
  date: string | null
  notes: string | null
}

const IMPORTED_BEANS: ImportedBean[] = [
  { id: 1, image_filename: "PXL_20260616_152500413.jpg", roaster: "Sonnentor", name: "Wiener Verführung Espresso", origin: null, region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: "dark", tasting_notes: null, notes: "Birthday Gift, 4/10" },
  { id: 2, image_filename: "PXL_20260616_152505780.jpg", roaster: "Jacobs", name: "Barista Editions Crema Intense", origin: null, region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: null, notes: null },
  { id: 3, image_filename: "PXL_20260616_152509403.jpg", roaster: "Dallmayr", name: "Crema d'Oro", origin: null, region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: "medium", tasting_notes: "samtig, fein, mild", notes: null },
  { id: 4, image_filename: "PXL_20260616_152511549.MP.jpg", roaster: "Melitta", name: "KENIA", origin: "Kenya", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: null, notes: null },
  { id: 5, image_filename: "PXL_20260616_152514115.jpg", roaster: "Murnauer Kaffeeroesterei", name: "La Villa", origin: "Brasilien", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: "medium", tasting_notes: "Walnüsse, Schokolade, Karamell, Mandeln", notes: "Frisch gemahlen. Goettscheplatz sehr lecker!" },
  { id: 6, image_filename: "PXL_20260616_152516805.jpg", roaster: null, name: "Piacenza", origin: null, region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: null, notes: null },
  { id: 7, image_filename: "PXL_20260616_152519371.jpg", roaster: "Murnauer Kaffeeroesterei", name: "San Miguel", origin: "Guatemala", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: "Schokolade, Nüsse, Beeren", notes: "Qualität 87" },
  { id: 8, image_filename: "PXL_20260616_152521424.jpg", roaster: "Murnauer Kaffeeroesterei", name: "El Castillo", origin: "Brasilien, Vietnam", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: "Schokolade, Nüsse, Nougat", notes: "70% Arabica, 30% Robusta" },
  { id: 9, image_filename: "PXL_20260616_152524818.jpg", roaster: "Murnauer Kaffeeroesterei", name: "Suke Quto", origin: "Ethiopia", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: "light", tasting_notes: "Fruits, cassis, milk chocolate", notes: "Schmeckt süß, schokoladig, bisschen wie light roast von sweet spot, Qualität 88, 4/10" },
  { id: 10, image_filename: "PXL_20260616_152527705.MP.jpg", roaster: null, name: "Pedro Sagastume", origin: "Honduras", region: "Santa Barbara", farm: "Los Quetzales", variety: "Pacas", process: "Washed", roast_date: null, roast_level: null, tasting_notes: "Caramel, Apple, Rhubarb", notes: "Recommendation: 16.5g auf 42g in 22s" },
  { id: 11, image_filename: "PXL_20260616_152530634.jpg", roaster: "Calendar", name: "Rwamata", origin: "Rwanda", region: "Karongi", farm: null, variety: "Bourbon", process: "washed", roast_date: null, roast_level: null, tasting_notes: "Apricot, Raisin", notes: "Harvest June 2024" },
  { id: 12, image_filename: "PXL_20260616_152533284.jpg", roaster: "Murnauer Kaffeeroesterei", name: "PachaMama", origin: "Peru", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: "Schokolade, Nüsse, tropische Früchte", notes: "Qualität 87, 5/10" },
  { id: 13, image_filename: "PXL_20260616_152535548.jpg", roaster: "FRUKT", name: "Mario Moreno", origin: "Honduras", region: null, farm: null, variety: "Pacas", process: "washed", roast_date: "2025-06-25", roast_level: null, tasting_notes: "apricot, peach", notes: null },
  { id: 14, image_filename: "PXL_20260616_152537759.jpg", roaster: "La Cabra", name: "Ana Sora", origin: null, region: null, farm: null, variety: null, process: "natural", roast_date: null, roast_level: null, tasting_notes: "floral, ripe", notes: null },
  { id: 15, image_filename: "PXL_20260616_152540488.jpg", roaster: "Murnauer Kaffeeroesterei", name: "Aricha", origin: "Ethiopia", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: null, notes: "Qualität 85, 100% Arabica" },
  { id: 16, image_filename: "PXL_20260616_152543774.jpg", roaster: "Bluebird Coffee Roastery", name: "Migioti Natural", origin: "Burundi", region: "Bujumbura", farm: "Migioti Coffee Co.", variety: "Red Bourbon", process: "Natural", roast_date: null, roast_level: null, tasting_notes: "Winey, raspberry jam, plums, and dark chocolate", notes: null },
  { id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", roaster: "Coffee Collective", name: "Bekele Natural", origin: "Ethiopia", region: "Sidama", farm: "Bekele Karchara", variety: "74-158 Kurume", process: "Natural", roast_date: "2025-10-08", roast_level: null, tasting_notes: "frugtig og sød, aroma af røde jordbær, vingummier, melon og bergamot", notes: "4/10" },
  { id: 18, image_filename: "PXL_20260616_152548197.jpg", roaster: "Nomad", name: "E.ET.BOCH", origin: "Ethiopia", region: "Bohesca", farm: null, variety: "Heirloom", process: "Honey", roast_date: "2026-03-25", roast_level: "medium_light", tasting_notes: "nectarina, mandarina", notes: "4/10" },
  { id: 19, image_filename: "PXL_20260616_152551048.MP.jpg", roaster: "Tanat", name: "Éthiopie - Alo Chilaka", origin: "Éthiopie", region: "Chilaka Village, Bensa", farm: null, variety: null, process: "natural", roast_date: null, roast_level: "medium", tasting_notes: "Ananas, Raisin blanc, Thé vert au jasmin", notes: "4/10" },
  { id: 20, image_filename: "PXL_20260616_152553540.MP.jpg", roaster: "koppi", name: "Santa Rosa 1900", origin: "Costa Rica", region: "Santa Rosa de León Cortés, Tarrazú, CR", farm: "Macho & Kevin Naranjo", variety: "Red Catuai", process: "washed", roast_date: null, roast_level: null, tasting_notes: "raisins, yellow plums, red berries", notes: null },
  { id: 21, image_filename: "PXL_20260616_152555973.jpg", roaster: "DAK Coffee Roasters", name: "Hazy Clafoutis", origin: "Kenya", region: "Kiambu", farm: "Mtao Estate", variety: "SL-28, SL-34, Ruiru 11", process: "Natural", roast_date: null, roast_level: "medium_light", tasting_notes: "Sweet Lemon Cake, Lavender, Cherry Jam", notes: null },
  { id: 22, image_filename: "PXL_20260616_152558280.MP.jpg", roaster: "Paso", name: "Syoum Family", origin: "Ethiopia", region: "Tafrei Kela, Sidamo", farm: "Bette Buna", variety: null, process: "washed", roast_date: null, roast_level: "medium_light", tasting_notes: "floral, pear, delicate", notes: "SCA score 86+" },
  { id: 23, image_filename: "PXL_20260616_152601446.MP.jpg", roaster: "FRUKT", name: "Mustafá", origin: "Colombia", region: "Pereira, Risaralda", farm: "Mustafá Family Farms", variety: "Cherry", process: "washed", roast_date: "2023-10-14", roast_level: "medium", tasting_notes: "red fruit, red apple, cherry, dark chocolate", notes: null },
  { id: 24, image_filename: "PXL_20260616_152603889.jpg", roaster: "bluebird coffee", name: "Delagua Castillo Honey", origin: "Colombia", region: "Sierra Nevada de Santa Maria", farm: "Delagua Coffee Paradise", variety: "Castillo", process: "Anaerobic Honey", roast_date: null, roast_level: null, tasting_notes: "Marmalade, yellow plum, honey", notes: "10/10 - Best after 10 days, consume within 6 months" },
  { id: 25, image_filename: "PXL_20260616_152605729.MP.jpg", roaster: "jb", name: "Ivan Solis", origin: "Costa Rica", region: "Santa María de Dota", farm: "Finca El Rosario", variety: "Mocca", process: "Natural", roast_date: null, roast_level: null, tasting_notes: "Jammy, Red Berries, Creamy", notes: null },
  { id: 26, image_filename: "PXL_20260616_152609794.jpg", roaster: "SEY", name: "Tamiru Tadesse Tesema", origin: "Ethiopia", region: "Alo Village, Bensa, Sidama", farm: "Alo Village", variety: "74158", process: "honey", roast_date: null, roast_level: null, tasting_notes: "dragon fruit, lychee, berries", notes: null },
  { id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", roaster: null, name: "Quo", origin: "Ethiopia", region: "Anasora, Guji in Taroka", farm: "Aman Adinew", variety: "JARC varieties", process: "Natural", roast_date: null, roast_level: "medium_light", tasting_notes: "Peach, Candy, Blackberry, Composte", notes: null },
  { id: 28, image_filename: "PXL_20260616_152615756.MP.jpg", roaster: "DAK", name: "Milky Cake", origin: "Colombia", region: "Cauca", farm: null, variety: "Castillo", process: "Advanced Fermentation", roast_date: null, roast_level: null, tasting_notes: "Cardamom, Pistachio, Vanilla Cake", notes: null },
  { id: 29, image_filename: "PXL_20260616_152619422.jpg", roaster: "Scenery", name: "Las Tres Hermanas CMN", origin: "Nicaragua", region: "Mosonte, Dipilto", farm: "Las Tres Hermanas", variety: "Bourbon Tekisic", process: "Carbonic Macerated Natural", roast_date: "2026-01-07", roast_level: "light", tasting_notes: "Morello Cherry, Wild Plum, Quince Jam", notes: "Roast Style: Lightest. Producer: Cynthia Morales. Rating: 5+/10." },
  { id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", roaster: "A. M. O. C.", name: "A Matter of Concrete", origin: "Colombia", region: "Génova, Quindío", farm: "El Girasol", variety: "Caturra | Castillo", process: "semi-washed", roast_date: "2026-01-12", roast_level: null, tasting_notes: "red apples, cacao, stonefruit", notes: null },
  { id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", roaster: "UN.COMMON", name: "La Piragua", origin: "Colombia", region: null, farm: null, variety: "Pink Bourbon", process: "Natural", roast_date: "2026-02-23", roast_level: null, tasting_notes: "Orange, Cherry, Milk Chocolate", notes: null },
  { id: 32, image_filename: "PXL_20260616_152627438.MP.jpg", roaster: "DAK", name: "Orange Flirt", origin: "Ethiopia", region: "Guji", farm: null, variety: "Heirloom", process: "natural", roast_date: null, roast_level: null, tasting_notes: "Kumquat, Jam, Dried Apricot, Nougat", notes: null },
  { id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", roaster: "Fjord", name: "House Blend Espresso", origin: null, region: null, farm: null, variety: null, process: "washed", roast_date: "2026-02-26", roast_level: null, tasting_notes: "milk chocolate, tropical fruits, almonds", notes: "50% Cascavel Vermelha Natural Brazil\n50% Kieni AB Washed Kenya" },
  { id: 34, image_filename: "PXL_20260616_152638662.jpg", roaster: "doubleshot", name: "Floripondio", origin: "Bolivia", region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: "Fruity, Elegant", notes: null },
  { id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", roaster: "bluebird coffee roastery", name: "Suke Quto Natural", origin: "Ethiopia", region: "Shakisso, Guji", farm: "Suke Quto GWS, 2100 masl", variety: "Heirloom", process: "Natural", roast_date: "2023-05-25", roast_level: null, tasting_notes: "Plum and red grape", notes: null },
  { id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", roaster: null, name: "Swervl", origin: null, region: null, farm: null, variety: null, process: null, roast_date: null, roast_level: null, tasting_notes: null, notes: null },
]

const IMPORTED_SHOTS: ImportedShot[] = [
  { bean_id: 1, image_filename: "PXL_20260616_152500413.jpg", dose_grams: 17, grind_setting: "4/6", basket: "standard", brew_time_seconds: 24, yield_grams: 32, date: "2026-05-09", notes: "bitter" },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 18, grind_setting: "5", basket: "standard", brew_time_seconds: 35, yield_grams: 35, date: "2026-05-09", notes: null },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 17, grind_setting: "7", basket: "NS", brew_time_seconds: 34, yield_grams: 36, date: "2026-05-12", notes: "Could be better" },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 18, grind_setting: "7", basket: "standard", brew_time_seconds: 35, yield_grams: 35, date: "2026-05-20", notes: null },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 22, grind_setting: "7", basket: "NS", brew_time_seconds: 39, yield_grams: 39, date: "2026-05-22", notes: "??" },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 28, grind_setting: "7", basket: "NS", brew_time_seconds: 47, yield_grams: 48, date: "2026-05-22", notes: "Better!" },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 25, grind_setting: "7", basket: "NS", brew_time_seconds: 47, yield_grams: 47, date: "2026-05-22", notes: "7:22-20:40 Cooked!" },
  { bean_id: 2, image_filename: "PXL_20260616_152505780.jpg", dose_grams: 26, grind_setting: "7", basket: "NS", brew_time_seconds: 46, yield_grams: 46, date: "2026-05-23", notes: "Try a puck" },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "15", basket: "standard", brew_time_seconds: 26, yield_grams: 36, date: "2026-05-03", notes: null },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "sm15", basket: "standard", brew_time_seconds: 26, yield_grams: 30, date: "2026-05-05", notes: "abt Note" },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 19, grind_setting: "15", basket: "standard", brew_time_seconds: 26, yield_grams: 37, date: "2026-05-06", notes: "abt Note" },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "15", basket: "standard", brew_time_seconds: 25, yield_grams: 38, date: "2026-05-07", notes: "verstaerkung" },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "7", basket: "standard", brew_time_seconds: 27, yield_grams: 36, date: "2026-06-01", notes: null },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "6", basket: "ND", brew_time_seconds: 15, yield_grams: 24, date: "2026-06-16", notes: null },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "D", basket: "NS", brew_time_seconds: 16, yield_grams: 33, date: "2026-07-01", notes: null },
  { bean_id: 3, image_filename: "PXL_20260616_152509403.jpg", dose_grams: 18, grind_setting: "D", basket: "NS", brew_time_seconds: 45, yield_grams: 33, date: "2026-06-07", notes: null },
  { bean_id: 4, image_filename: "PXL_20260616_152511549.MP.jpg", dose_grams: 18, grind_setting: "4", basket: "standard", brew_time_seconds: 45, yield_grams: 20, date: "2026-06-23", notes: null },
  { bean_id: 4, image_filename: "PXL_20260616_152511549.MP.jpg", dose_grams: 18, grind_setting: "8", basket: "ND", brew_time_seconds: 27, yield_grams: 35, date: "2026-06-23", notes: "Sehr nice!" },
  { bean_id: 4, image_filename: "PXL_20260616_152511549.MP.jpg", dose_grams: 18, grind_setting: "8", basket: "NS", brew_time_seconds: 30, yield_grams: 36, date: "2026-06-23", notes: "holy, slight burnt" },
  { bean_id: 4, image_filename: "PXL_20260616_152511549.MP.jpg", dose_grams: 18, grind_setting: "6", basket: "standard", brew_time_seconds: 30, yield_grams: 36, date: "2026-06-23", notes: "bitter" },
  { bean_id: 5, image_filename: "PXL_20260616_152514115.jpg", dose_grams: 18, grind_setting: "716", basket: "ND", brew_time_seconds: 40, yield_grams: 22, date: "2026-09-05", notes: "Puck Filter" },
  { bean_id: 5, image_filename: "PXL_20260616_152514115.jpg", dose_grams: 18, grind_setting: "716", basket: "ND", brew_time_seconds: 28, yield_grams: 28, date: "2026-07-08", notes: "Puck" },
  { bean_id: 5, image_filename: "PXL_20260616_152514115.jpg", dose_grams: 18, grind_setting: "1215", basket: "ND", brew_time_seconds: 25, yield_grams: 36, date: "2026-07-12", notes: "Bitter" },
  { bean_id: 6, image_filename: "PXL_20260616_152516805.jpg", dose_grams: 18, grind_setting: "2", basket: "S", brew_time_seconds: 32, yield_grams: 21, date: null, notes: "Bitter!" },
  { bean_id: 6, image_filename: "PXL_20260616_152516805.jpg", dose_grams: 14, grind_setting: "4", basket: "S", brew_time_seconds: 33, yield_grams: 21, date: null, notes: "4" },
  { bean_id: 6, image_filename: "PXL_20260616_152516805.jpg", dose_grams: 17, grind_setting: null, basket: "NS", brew_time_seconds: 28, yield_grams: 27, date: null, notes: "26s" },
  { bean_id: 6, image_filename: "PXL_20260616_152516805.jpg", dose_grams: 18, grind_setting: "2", basket: "standard", brew_time_seconds: 30, yield_grams: 30, date: null, notes: "schnell" },
  { bean_id: 6, image_filename: "PXL_20260616_152516805.jpg", dose_grams: 18, grind_setting: "8", basket: "S", brew_time_seconds: 30, yield_grams: 30, date: null, notes: "6" },
  { bean_id: 7, image_filename: "PXL_20260616_152519371.jpg", dose_grams: 18, grind_setting: "18", basket: "standard", brew_time_seconds: 25, yield_grams: 36, date: "2026-05-09", notes: "fader, zu schnell" },
  { bean_id: 7, image_filename: "PXL_20260616_152519371.jpg", dose_grams: 18, grind_setting: "10", basket: "standard", brew_time_seconds: 25, yield_grams: 30, date: "2026-05-18", notes: "NS! Geilo!!" },
  { bean_id: 7, image_filename: "PXL_20260616_152519371.jpg", dose_grams: 18, grind_setting: "10", basket: "NS", brew_time_seconds: 27, yield_grams: 35, date: "2026-05-18", notes: null },
  { bean_id: 7, image_filename: "PXL_20260616_152519371.jpg", dose_grams: 18, grind_setting: "10", basket: "NS", brew_time_seconds: 27, yield_grams: 34, date: "2026-05-27", notes: "zu schnell" },
  { bean_id: 7, image_filename: "PXL_20260616_152519371.jpg", dose_grams: 18, grind_setting: "11", basket: "ND", brew_time_seconds: 26, yield_grams: 26, date: "2026-05-28", notes: "zu lange" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 18, grind_setting: "2", basket: "NS", brew_time_seconds: 40, yield_grams: 16, date: null, notes: "Frucht, süß" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 18, grind_setting: "11", basket: "NS", brew_time_seconds: 32, yield_grams: 32, date: null, notes: "Frucht, süß" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 17, grind_setting: "7", basket: "standard", brew_time_seconds: 30, yield_grams: 31, date: null, notes: "Super schokoladig!" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 9, grind_setting: "9", basket: "standard", brew_time_seconds: 36, yield_grams: 25, date: null, notes: "Zu langsam!!" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 11, grind_setting: "11", basket: "standard", brew_time_seconds: 32, yield_grams: 36, date: null, notes: "Crazy schokoladig!" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 12, grind_setting: "12", basket: "standard", brew_time_seconds: 26, yield_grams: 56, date: null, notes: "Spritzig" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 11, grind_setting: "11", basket: "standard", brew_time_seconds: 26, yield_grams: 30, date: null, notes: "Spritzig, etwas wässrig" },
  { bean_id: 9, image_filename: "PXL_20260616_152524818.jpg", dose_grams: 10, grind_setting: "10", basket: "standard", brew_time_seconds: 32, yield_grams: 40, date: null, notes: "Sehr gut" },
  { bean_id: 10, image_filename: "PXL_20260616_152527705.MP.jpg", dose_grams: 16.5, grind_setting: "8", basket: "NS", brew_time_seconds: 33, yield_grams: 35, date: null, notes: "Sehr geil" },
  { bean_id: 10, image_filename: "PXL_20260616_152527705.MP.jpg", dose_grams: 17, grind_setting: "11", basket: null, brew_time_seconds: 23, yield_grams: 30, date: null, notes: "Viel zu spät" },
  { bean_id: 10, image_filename: "PXL_20260616_152527705.MP.jpg", dose_grams: 16, grind_setting: "10", basket: null, brew_time_seconds: 23, yield_grams: 45, date: null, notes: "Guter Malgrad" },
  { bean_id: 10, image_filename: "PXL_20260616_152527705.MP.jpg", dose_grams: 16, grind_setting: "10", basket: null, brew_time_seconds: 18, yield_grams: 42, date: null, notes: null },
  { bean_id: 10, image_filename: "PXL_20260616_152527705.MP.jpg", dose_grams: 16.5, grind_setting: null, basket: null, brew_time_seconds: 22, yield_grams: 42, date: null, notes: null },
  { bean_id: 11, image_filename: "PXL_20260616_152530634.jpg", dose_grams: 17.5, grind_setting: "9", basket: "NS", brew_time_seconds: 27, yield_grams: 42, date: null, notes: null },
  { bean_id: 11, image_filename: "PXL_20260616_152530634.jpg", dose_grams: 10, grind_setting: "7", basket: null, brew_time_seconds: 22, yield_grams: 46, date: null, notes: "geil!!" },
  { bean_id: 11, image_filename: "PXL_20260616_152530634.jpg", dose_grams: 17.5, grind_setting: null, basket: null, brew_time_seconds: 21, yield_grams: 26, date: null, notes: null },
  { bean_id: 11, image_filename: "PXL_20260616_152530634.jpg", dose_grams: 17.5, grind_setting: "8", basket: null, brew_time_seconds: 18, yield_grams: 40, date: null, notes: null },
  { bean_id: 12, image_filename: "PXL_20260616_152533284.jpg", dose_grams: 18, grind_setting: "7", basket: "NS", brew_time_seconds: 36, yield_grams: 50, date: "2026-05-09", notes: null },
  { bean_id: 12, image_filename: "PXL_20260616_152533284.jpg", dose_grams: 16.5, grind_setting: "8.5", basket: "NS", brew_time_seconds: 26, yield_grams: 44, date: "2026-05-09", notes: null },
  { bean_id: 12, image_filename: "PXL_20260616_152533284.jpg", dose_grams: 17, grind_setting: "5", basket: "NS", brew_time_seconds: 28, yield_grams: 38, date: "2026-05-09", notes: null },
  { bean_id: 13, image_filename: "PXL_20260616_152535548.jpg", dose_grams: 16.5, grind_setting: null, basket: "standard", brew_time_seconds: 23, yield_grams: 45, date: null, notes: null },
  { bean_id: 13, image_filename: "PXL_20260616_152535548.jpg", dose_grams: 16, grind_setting: "5", basket: "NS", brew_time_seconds: 20, yield_grams: 28, date: "2026-05-09", notes: null },
  { bean_id: 13, image_filename: "PXL_20260616_152535548.jpg", dose_grams: 16, grind_setting: "5", basket: "NS", brew_time_seconds: 28, yield_grams: 40, date: null, notes: null },
  { bean_id: 13, image_filename: "PXL_20260616_152535548.jpg", dose_grams: 16.5, grind_setting: "7", basket: "NS", brew_time_seconds: 20, yield_grams: 45, date: null, notes: "kein Spitzen, perfekt!" },
  { bean_id: 13, image_filename: "PXL_20260616_152535548.jpg", dose_grams: 26.5, grind_setting: "6", basket: "NS", brew_time_seconds: 23, yield_grams: 45, date: null, notes: null },
  { bean_id: 13, image_filename: "PXL_20260616_152535548.jpg", dose_grams: null, grind_setting: "3", basket: null, brew_time_seconds: 23, yield_grams: 50, date: null, notes: null },
  { bean_id: 14, image_filename: "PXL_20260616_152537759.jpg", dose_grams: 16.5, grind_setting: "7", basket: "NS", brew_time_seconds: 28, yield_grams: 38, date: null, notes: "Spritz!" },
  { bean_id: 14, image_filename: "PXL_20260616_152537759.jpg", dose_grams: 16.5, grind_setting: "9", basket: "NS", brew_time_seconds: 25, yield_grams: 46, date: null, notes: "Spritz!" },
  { bean_id: 14, image_filename: "PXL_20260616_152537759.jpg", dose_grams: null, grind_setting: null, basket: null, brew_time_seconds: 23, yield_grams: 47, date: null, notes: "Sehr lecker!" },
  { bean_id: 14, image_filename: "PXL_20260616_152537759.jpg", dose_grams: 11, grind_setting: "8", basket: "ND", brew_time_seconds: 25, yield_grams: 46, date: null, notes: "Kein spritz!" },
  { bean_id: 14, image_filename: "PXL_20260616_152537759.jpg", dose_grams: 16.5, grind_setting: null, basket: null, brew_time_seconds: 35, yield_grams: 46, date: null, notes: null },
  { bean_id: 15, image_filename: "PXL_20260616_152540488.jpg", dose_grams: 18, grind_setting: "7", basket: "NS", brew_time_seconds: 36, yield_grams: 50, date: null, notes: null },
  { bean_id: 15, image_filename: "PXL_20260616_152540488.jpg", dose_grams: null, grind_setting: "6", basket: null, brew_time_seconds: 22, yield_grams: 35, date: null, notes: null },
  { bean_id: 15, image_filename: "PXL_20260616_152540488.jpg", dose_grams: 15.5, grind_setting: "4", basket: null, brew_time_seconds: 28, yield_grams: 35, date: null, notes: null },
  { bean_id: 15, image_filename: "PXL_20260616_152540488.jpg", dose_grams: 16, grind_setting: "6", basket: null, brew_time_seconds: 232, yield_grams: 35, date: null, notes: "bitter" },
  { bean_id: 15, image_filename: "PXL_20260616_152540488.jpg", dose_grams: 16, grind_setting: "8", basket: null, brew_time_seconds: 20, yield_grams: 40, date: null, notes: null },
  { bean_id: 16, image_filename: "PXL_20260616_152543774.jpg", dose_grams: 16.8, grind_setting: "5", basket: "NS", brew_time_seconds: 27, yield_grams: 41, date: null, notes: "Saucer" },
  { bean_id: 16, image_filename: "PXL_20260616_152543774.jpg", dose_grams: 16.8, grind_setting: "5", basket: "NS", brew_time_seconds: 24, yield_grams: 40, date: null, notes: "weniger sauer" },
  { bean_id: 16, image_filename: "PXL_20260616_152543774.jpg", dose_grams: 16.5, grind_setting: "5", basket: "NS", brew_time_seconds: 23, yield_grams: 41, date: null, notes: null },
  { bean_id: 16, image_filename: "PXL_20260616_152543774.jpg", dose_grams: 16.9, grind_setting: "5", basket: "NS", brew_time_seconds: 24, yield_grams: 39, date: null, notes: "dosed basket" },
  { bean_id: 16, image_filename: "PXL_20260616_152543774.jpg", dose_grams: 16.3, grind_setting: null, basket: null, brew_time_seconds: 20, yield_grams: 40, date: null, notes: null },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 16.5, grind_setting: "7", basket: "NS", brew_time_seconds: 23, yield_grams: 43, date: "2026-05-16", notes: "saucer!" },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 16.5, grind_setting: "5", basket: "NS", brew_time_seconds: 25, yield_grams: 27, date: "2026-05-16", notes: "immer noch too long" },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 0, grind_setting: null, basket: "NS", brew_time_seconds: 30, yield_grams: 30, date: "2026-05-16", notes: "bitter" },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 0, grind_setting: null, basket: null, brew_time_seconds: 35, yield_grams: 30, date: "2026-05-16", notes: null },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 8, grind_setting: null, basket: null, brew_time_seconds: 27, yield_grams: 40, date: "2026-05-16", notes: null },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 8, grind_setting: null, basket: null, brew_time_seconds: 20, yield_grams: 46, date: "2026-05-16", notes: "gut!" },
  { bean_id: 17, image_filename: "PXL_20260616_152545514.MP.jpg", dose_grams: 16.5, grind_setting: null, basket: null, brew_time_seconds: 23, yield_grams: 45, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: "6", basket: "NS", brew_time_seconds: 30, yield_grams: 33, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: "8", basket: "NS", brew_time_seconds: 45, yield_grams: 29, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: "9", basket: null, brew_time_seconds: 45, yield_grams: 4, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: null, basket: null, brew_time_seconds: 24, yield_grams: 45, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: null, basket: null, brew_time_seconds: 27, yield_grams: 45, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: "10", basket: "NS", brew_time_seconds: 20, yield_grams: 45, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: null, basket: null, brew_time_seconds: 26, yield_grams: 45, date: null, notes: null },
  { bean_id: 18, image_filename: "PXL_20260616_152548197.jpg", dose_grams: 17, grind_setting: null, basket: null, brew_time_seconds: 26, yield_grams: 45, date: null, notes: "17g auf 45g in 26s" },
  { bean_id: 19, image_filename: "PXL_20260616_152551048.MP.jpg", dose_grams: 16, grind_setting: "8", basket: "NS", brew_time_seconds: 25, yield_grams: 26, date: null, notes: null },
  { bean_id: 19, image_filename: "PXL_20260616_152551048.MP.jpg", dose_grams: 16, grind_setting: "8", basket: "NS", brew_time_seconds: 25, yield_grams: 30, date: null, notes: null },
  { bean_id: 19, image_filename: "PXL_20260616_152551048.MP.jpg", dose_grams: 16.5, grind_setting: "10", basket: "NS", brew_time_seconds: 25, yield_grams: 45, date: null, notes: null },
  { bean_id: 19, image_filename: "PXL_20260616_152551048.MP.jpg", dose_grams: 16.5, grind_setting: "10", basket: "NS", brew_time_seconds: 32, yield_grams: 45, date: null, notes: "offen" },
  { bean_id: 19, image_filename: "PXL_20260616_152551048.MP.jpg", dose_grams: 16.5, grind_setting: null, basket: null, brew_time_seconds: 26, yield_grams: 45, date: null, notes: "17g auf 45g in 26s" },
  { bean_id: 20, image_filename: "PXL_20260616_152553540.MP.jpg", dose_grams: 16.5, grind_setting: "8", basket: "NS", brew_time_seconds: 23, yield_grams: 44, date: null, notes: null },
  { bean_id: 20, image_filename: "PXL_20260616_152553540.MP.jpg", dose_grams: 17, grind_setting: null, basket: null, brew_time_seconds: 26, yield_grams: 45, date: null, notes: "17g auf 45g in 26s" },
  { bean_id: 21, image_filename: "PXL_20260616_152555973.jpg", dose_grams: 16.5, grind_setting: "11", basket: "NS", brew_time_seconds: 20, yield_grams: 42, date: "2026-05-09", notes: null },
  { bean_id: 21, image_filename: "PXL_20260616_152555973.jpg", dose_grams: 16.5, grind_setting: "10", basket: "NS", brew_time_seconds: 21, yield_grams: 45, date: "2026-05-10", notes: null },
  { bean_id: 21, image_filename: "PXL_20260616_152555973.jpg", dose_grams: 16.3, grind_setting: "9", basket: null, brew_time_seconds: 20, yield_grams: 43, date: "2026-06-13", notes: null },
  { bean_id: 21, image_filename: "PXL_20260616_152555973.jpg", dose_grams: 17.5, grind_setting: null, basket: "standard", brew_time_seconds: 18, yield_grams: 45, date: null, notes: "17.5g auf 45g in 18s" },
  { bean_id: 21, image_filename: "PXL_20260616_152555973.jpg", dose_grams: null, grind_setting: "8", basket: null, brew_time_seconds: 22, yield_grams: 45, date: "2026-01-07", notes: null },
  { bean_id: 22, image_filename: "PXL_20260616_152558280.MP.jpg", dose_grams: 16, grind_setting: "6", basket: "ND", brew_time_seconds: 20, yield_grams: 42, date: null, notes: "espresso" },
  { bean_id: 22, image_filename: "PXL_20260616_152558280.MP.jpg", dose_grams: 17.2, grind_setting: "6", basket: "NS", brew_time_seconds: 22, yield_grams: 47, date: null, notes: null },
  { bean_id: 22, image_filename: "PXL_20260616_152558280.MP.jpg", dose_grams: 17, grind_setting: null, basket: null, brew_time_seconds: 26, yield_grams: 45, date: null, notes: null },
  { bean_id: 23, image_filename: "PXL_20260616_152601446.MP.jpg", dose_grams: 16.5, grind_setting: "6", basket: "NS", brew_time_seconds: 27, yield_grams: 40, date: null, notes: null },
  { bean_id: 23, image_filename: "PXL_20260616_152601446.MP.jpg", dose_grams: 16.6, grind_setting: "6", basket: "NS", brew_time_seconds: 23, yield_grams: 38, date: null, notes: null },
  { bean_id: 23, image_filename: "PXL_20260616_152601446.MP.jpg", dose_grams: 16.3, grind_setting: "8", basket: "NS", brew_time_seconds: 22, yield_grams: 46, date: null, notes: null },
  { bean_id: 23, image_filename: "PXL_20260616_152601446.MP.jpg", dose_grams: 16.5, grind_setting: null, basket: null, brew_time_seconds: 22, yield_grams: 48, date: null, notes: null },
  { bean_id: 24, image_filename: "PXL_20260616_152603889.jpg", dose_grams: 17.5, grind_setting: "5", basket: "NS", brew_time_seconds: 20, yield_grams: 45, date: null, notes: null },
  { bean_id: 24, image_filename: "PXL_20260616_152603889.jpg", dose_grams: 17.5, grind_setting: "6.5", basket: "NS", brew_time_seconds: 20, yield_grams: 44, date: null, notes: null },
  { bean_id: 24, image_filename: "PXL_20260616_152603889.jpg", dose_grams: 17.5, grind_setting: "6", basket: "NS", brew_time_seconds: 20, yield_grams: 54, date: null, notes: null },
  { bean_id: 24, image_filename: "PXL_20260616_152603889.jpg", dose_grams: 17.5, grind_setting: "7", basket: "NS", brew_time_seconds: 20, yield_grams: 49, date: null, notes: null },
  { bean_id: 24, image_filename: "PXL_20260616_152603889.jpg", dose_grams: 17.5, grind_setting: "6", basket: "NS", brew_time_seconds: 20, yield_grams: 49, date: null, notes: "17.5g auf 49g in 20s" },
  { bean_id: 25, image_filename: "PXL_20260616_152605729.MP.jpg", dose_grams: 17.5, grind_setting: "8", basket: "NS", brew_time_seconds: 24, yield_grams: 38, date: null, notes: null },
  { bean_id: 25, image_filename: "PXL_20260616_152605729.MP.jpg", dose_grams: null, grind_setting: "9", basket: null, brew_time_seconds: 26, yield_grams: null, date: null, notes: null },
  { bean_id: 25, image_filename: "PXL_20260616_152605729.MP.jpg", dose_grams: null, grind_setting: "7", basket: null, brew_time_seconds: 22, yield_grams: 50, date: null, notes: "no pressure" },
  { bean_id: 25, image_filename: "PXL_20260616_152605729.MP.jpg", dose_grams: null, grind_setting: "65", basket: null, brew_time_seconds: 20, yield_grams: 42, date: null, notes: null },
  { bean_id: 25, image_filename: "PXL_20260616_152605729.MP.jpg", dose_grams: 17, grind_setting: null, basket: "standard", brew_time_seconds: 26, yield_grams: 45, date: null, notes: null },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: 17.5, grind_setting: "9", basket: "standard", brew_time_seconds: 20, yield_grams: 47, date: null, notes: null },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: 17.5, grind_setting: "9.5", basket: "NS", brew_time_seconds: 26, yield_grams: 33, date: null, notes: null },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: null, grind_setting: "6", basket: "standard", brew_time_seconds: 28, yield_grams: 38, date: null, notes: null },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: 11, grind_setting: "11", basket: "standard", brew_time_seconds: 24, yield_grams: 38, date: null, notes: null },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: 11, grind_setting: "7", basket: "11", brew_time_seconds: 24, yield_grams: 42, date: null, notes: null },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: 11, grind_setting: "11", basket: "11", brew_time_seconds: 24, yield_grams: 47, date: null, notes: "Lecker" },
  { bean_id: 27, image_filename: "PXL_20260616_152611551.MP.jpg", dose_grams: 17.5, grind_setting: null, basket: "standard", brew_time_seconds: 23, yield_grams: 43, date: null, notes: null },
  { bean_id: 28, image_filename: "PXL_20260616_152615756.MP.jpg", dose_grams: 17.5, grind_setting: "7", basket: "NS", brew_time_seconds: 26, yield_grams: 43, date: null, notes: null },
  { bean_id: 28, image_filename: "PXL_20260616_152615756.MP.jpg", dose_grams: 17, grind_setting: null, basket: "standard", brew_time_seconds: 21, yield_grams: 68, date: null, notes: null },
  { bean_id: 29, image_filename: "PXL_20260616_152619422.jpg", dose_grams: 18, grind_setting: "8", basket: "NS", brew_time_seconds: 18, yield_grams: 50, date: null, notes: null },
  { bean_id: 29, image_filename: "PXL_20260616_152619422.jpg", dose_grams: 18, grind_setting: "4", basket: "NS", brew_time_seconds: 20, yield_grams: 50, date: null, notes: null },
  { bean_id: 29, image_filename: "PXL_20260616_152619422.jpg", dose_grams: 18.2, grind_setting: "2", basket: "NS", brew_time_seconds: 20, yield_grams: 48, date: null, notes: null },
  { bean_id: 29, image_filename: "PXL_20260616_152619422.jpg", dose_grams: 18.1, grind_setting: "7", basket: "NS", brew_time_seconds: 20, yield_grams: 48, date: null, notes: null },
  { bean_id: 29, image_filename: "PXL_20260616_152619422.jpg", dose_grams: 18, grind_setting: null, basket: "standard", brew_time_seconds: 23, yield_grams: 48, date: null, notes: "Handwritten note" },
  { bean_id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", dose_grams: 17.5, grind_setting: "7", basket: "NS", brew_time_seconds: 18, yield_grams: 45, date: null, notes: null },
  { bean_id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", dose_grams: 17.5, grind_setting: "5", basket: "NS", brew_time_seconds: 20, yield_grams: 46, date: null, notes: null },
  { bean_id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", dose_grams: 17.5, grind_setting: "3", basket: "NS", brew_time_seconds: 25, yield_grams: 46, date: null, notes: null },
  { bean_id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", dose_grams: 11, grind_setting: "2", basket: "11", brew_time_seconds: 24, yield_grams: 34, date: null, notes: null },
  { bean_id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", dose_grams: 11, grind_setting: "3", basket: "11", brew_time_seconds: 23, yield_grams: 38, date: null, notes: null },
  { bean_id: 30, image_filename: "PXL_20260616_152623111.MP.jpg", dose_grams: 17.5, grind_setting: null, basket: null, brew_time_seconds: 23, yield_grams: 46, date: null, notes: "17.5g out 46g in 23s" },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 18, grind_setting: "5", basket: "NS", brew_time_seconds: 35, yield_grams: 48, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 18, grind_setting: "7", basket: "NS", brew_time_seconds: 20, yield_grams: 42, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 18, grind_setting: "2", basket: "NS", brew_time_seconds: 33, yield_grams: 48, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 17, grind_setting: "4", basket: "NS", brew_time_seconds: 21, yield_grams: 49, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 17, grind_setting: "4", basket: "NS", brew_time_seconds: 20, yield_grams: 48, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 17.5, grind_setting: "2", basket: "11", brew_time_seconds: 23, yield_grams: 35, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 18, grind_setting: "3", basket: "11", brew_time_seconds: 23, yield_grams: 42, date: null, notes: null },
  { bean_id: 31, image_filename: "PXL_20260616_152624938.MP.jpg", dose_grams: 18, grind_setting: null, basket: null, brew_time_seconds: 25, yield_grams: 48, date: null, notes: "18g auf 48g in 24s" },
  { bean_id: 32, image_filename: "PXL_20260616_152627438.MP.jpg", dose_grams: 18.2, grind_setting: "8", basket: "NS", brew_time_seconds: 26, yield_grams: 48, date: "2026-01-05", notes: null },
  { bean_id: 32, image_filename: "PXL_20260616_152627438.MP.jpg", dose_grams: 14, grind_setting: "7", basket: "standard", brew_time_seconds: 30, yield_grams: 44, date: "2026-01-07", notes: null },
  { bean_id: 32, image_filename: "PXL_20260616_152627438.MP.jpg", dose_grams: 16, grind_setting: "11", basket: "standard", brew_time_seconds: 23, yield_grams: 50, date: "2026-01-11", notes: null },
  { bean_id: 32, image_filename: "PXL_20260616_152627438.MP.jpg", dose_grams: 18.2, grind_setting: null, basket: null, brew_time_seconds: 24, yield_grams: 60, date: null, notes: "Handwritten entry" },
  { bean_id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", dose_grams: 18, grind_setting: "6", basket: "NS", brew_time_seconds: 35, yield_grams: 30, date: null, notes: null },
  { bean_id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", dose_grams: 18.1, grind_setting: "8", basket: "NS", brew_time_seconds: 28, yield_grams: 36, date: null, notes: null },
  { bean_id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", dose_grams: 18, grind_setting: "7", basket: "NS", brew_time_seconds: 25, yield_grams: 46, date: null, notes: null },
  { bean_id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", dose_grams: 18, grind_setting: null, basket: "standard", brew_time_seconds: 32, yield_grams: 36, date: null, notes: null },
  { bean_id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", dose_grams: 11, grind_setting: "10", basket: "standard", brew_time_seconds: 24, yield_grams: 60, date: null, notes: null },
  { bean_id: 33, image_filename: "PXL_20260616_152635974.MP.jpg", dose_grams: 11, grind_setting: "11", basket: "standard", brew_time_seconds: 25, yield_grams: 60, date: null, notes: null },
  { bean_id: 34, image_filename: "PXL_20260616_152638662.jpg", dose_grams: 18, grind_setting: "10", basket: "ND", brew_time_seconds: 20, yield_grams: 46, date: null, notes: null },
  { bean_id: 34, image_filename: "PXL_20260616_152638662.jpg", dose_grams: 11, grind_setting: "8", basket: "ND", brew_time_seconds: 20, yield_grams: 58, date: null, notes: null },
  { bean_id: 34, image_filename: "PXL_20260616_152638662.jpg", dose_grams: 11, grind_setting: "6", basket: "standard", brew_time_seconds: 20, yield_grams: 46, date: null, notes: null },
  { bean_id: 34, image_filename: "PXL_20260616_152638662.jpg", dose_grams: 11, grind_setting: "4", basket: "standard", brew_time_seconds: 20, yield_grams: 45, date: null, notes: null },
  { bean_id: 34, image_filename: "PXL_20260616_152638662.jpg", dose_grams: 11, grind_setting: "2", basket: "standard", brew_time_seconds: 25, yield_grams: 46, date: null, notes: null },
  { bean_id: 34, image_filename: "PXL_20260616_152638662.jpg", dose_grams: 18, grind_setting: null, basket: "standard", brew_time_seconds: 25, yield_grams: 46, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 18, grind_setting: "6", basket: "ND", brew_time_seconds: 26, yield_grams: 48, date: null, notes: "26 small" },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 18, grind_setting: "4", basket: "11", brew_time_seconds: null, yield_grams: 22.48, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 16.5, grind_setting: "2", basket: "11", brew_time_seconds: 30, yield_grams: 30.3, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 16.5, grind_setting: "3", basket: "11", brew_time_seconds: 31, yield_grams: 36.5, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 11, grind_setting: "46", basket: "11", brew_time_seconds: 22, yield_grams: 44, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 11, grind_setting: "8", basket: "11", brew_time_seconds: 23, yield_grams: 45, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 11, grind_setting: "11", basket: "11", brew_time_seconds: 22, yield_grams: 48, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 11, grind_setting: "6", basket: "11", brew_time_seconds: 26, yield_grams: 45, date: null, notes: null },
  { bean_id: 35, image_filename: "PXL_20260616_152640741.MP.jpg", dose_grams: 16.5, grind_setting: null, basket: "standard", brew_time_seconds: 22, yield_grams: 45, date: null, notes: "16.5g auf 45g in 22s" },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: 12.8, grind_setting: "9", basket: "ND", brew_time_seconds: 20, yield_grams: 50, date: null, notes: "too sour" },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: 12.5, grind_setting: "7", basket: "11", brew_time_seconds: 20, yield_grams: 46, date: null, notes: "quite good" },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "8", basket: "11", brew_time_seconds: null, yield_grams: 40, date: null, notes: null },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "6", basket: "11", brew_time_seconds: 21, yield_grams: 45, date: null, notes: null },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "5", basket: "11", brew_time_seconds: 20, yield_grams: 39, date: null, notes: "+ too sour" },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "5", basket: "11", brew_time_seconds: 20, yield_grams: 38, date: null, notes: null },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "4", basket: "5", brew_time_seconds: 20, yield_grams: 37, date: null, notes: null },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "4", basket: "4", brew_time_seconds: 21, yield_grams: 36, date: null, notes: null },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "4", basket: "7", brew_time_seconds: 23.5, yield_grams: 36, date: null, notes: null },
  { bean_id: 36, image_filename: "PXL_20260616_152643004.MP.jpg", dose_grams: null, grind_setting: "4", basket: "4", brew_time_seconds: 19, yield_grams: 28, date: null, notes: null },
]

const THUMBNAILS_SOURCE = "/tmp/opencode/coffee-logs/thumbnails"
const STORAGE_BASE = process.env.STORAGE_PATH || "./uploads"

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

async function copyImageToStorage(sourceFilename: string, beanId: number): Promise<{ storagePath: string; sizeBytes: number } | null> {
  const sourcePath = join(THUMBNAILS_SOURCE, sourceFilename)
  
  try {
    const stats = await stat(sourcePath)
    const storagePath = `beans/${beanId}/${sourceFilename}`
    const destPath = join(STORAGE_BASE, storagePath)
    
    await mkdir(dirname(destPath), { recursive: true })
    await copyFile(sourcePath, destPath)
    
    return { storagePath, sizeBytes: stats.size }
  } catch {
    return null
  }
}

function normalizeProcess(process: string | null): string | null {
  if (!process) return null
  const lower = process.toLowerCase()
  if (lower.includes("washed")) return "Washed"
  if (lower.includes("natural")) return "Natural"
  if (lower.includes("honey")) return "Honey"
  if (lower.includes("anaerobic")) return "Anaerobic"
  if (lower.includes("semi-washed") || lower.includes("pulped")) return "Semi-washed"
  if (lower.includes("carbonic")) return "Carbonic Maceration"
  if (lower.includes("ferment")) return "Fermented"
  return process
}

async function seed() {
  console.log("🌱 Seeding database with imported coffee log data...")

  console.log("  → Inserting taste tags...")
  const insertedTags = await db.insert(schema.tasteTags).values(TASTE_TAGS).onConflictDoNothing().returning()
  console.log(`    ✓ ${insertedTags.length} taste tags`)

  const uniqueRoasters = [...new Set(IMPORTED_BEANS.map((b) => b.roaster).filter(Boolean))] as string[]
  console.log("  → Inserting roasters...")
  const roasterData = uniqueRoasters.map((name) => ({ name }))
  const insertedRoasters = await db.insert(schema.roasters).values(roasterData).onConflictDoNothing().returning()
  console.log(`    ✓ ${insertedRoasters.length} roasters`)

  const allRoasters = await db.query.roasters.findMany()
  const roasterMap = new Map(allRoasters.map((r) => [r.name, r.id]))

  console.log("  → Inserting beans...")
  const beansData = IMPORTED_BEANS.map((bean) => ({
    name: bean.name,
    roaster: bean.roaster,
    roasterId: bean.roaster ? roasterMap.get(bean.roaster) ?? null : null,
    origin: bean.origin,
    region: bean.region,
    farm: bean.farm,
    variety: bean.variety,
    process: normalizeProcess(bean.process),
    roastLevel: bean.roast_level,
    roastDate: parseDate(bean.roast_date),
    notes: [bean.tasting_notes, bean.notes].filter(Boolean).join("\n") || null,
  }))

  const insertedBeans = await db.insert(schema.beans).values(beansData).returning()
  console.log(`    ✓ ${insertedBeans.length} beans`)

  const beanIdMap = new Map<number, number>()
  const beanImageMap = new Map<number, string>()
  IMPORTED_BEANS.forEach((importedBean, index) => {
    beanIdMap.set(importedBean.id, insertedBeans[index].id)
    beanImageMap.set(insertedBeans[index].id, importedBean.image_filename)
  })

  console.log("  → Copying images and creating bean_images records...")
  let imageCount = 0
  for (const [dbBeanId, imageFilename] of beanImageMap) {
    const result = await copyImageToStorage(imageFilename, dbBeanId)
    if (result) {
      await db.insert(schema.beanImages).values({
        beanId: dbBeanId,
        storagePath: result.storagePath,
        originalFilename: imageFilename,
        mimeType: "image/jpeg",
        sizeBytes: result.sizeBytes,
        isThumbnail: true,
      })
      imageCount++
    }
  }
  console.log(`    ✓ ${imageCount} bean images`)

  console.log("  → Inserting gear...")
  const gearData = GEAR.map((g) => ({
    name: g.name,
    brand: g.brand,
    model: g.model,
    type: g.type,
    notes: g.notes,
  }))
  const insertedGear = await db.insert(schema.gear).values(gearData).returning()
  console.log(`    ✓ ${insertedGear.length} gear items`)

  console.log("  → Copying gear images...")
  let gearImageCount = 0
  for (let i = 0; i < GEAR.length; i++) {
    const gearItem = GEAR[i]
    const dbGear = insertedGear[i]
    if (gearItem.image_source && gearItem.image_filename) {
      try {
        const stats = await stat(gearItem.image_source)
        const storagePath = `gear/${dbGear.id}/${gearItem.image_filename}`
        const destPath = join(STORAGE_BASE, storagePath)
        await mkdir(dirname(destPath), { recursive: true })
        await copyFile(gearItem.image_source, destPath)
        await db.insert(schema.gearImages).values({
          gearId: dbGear.id,
          storagePath,
          originalFilename: gearItem.image_filename,
          mimeType: gearItem.image_filename.endsWith(".webp") ? "image/webp" : "image/jpeg",
          sizeBytes: stats.size,
        })
        gearImageCount++
      } catch {
        console.log(`    ! Failed to copy image for ${gearItem.name}`)
      }
    }
  }
  console.log(`    ✓ ${gearImageCount} gear images`)

  console.log("  → Creating recipe...")
  const brevilleId = insertedGear.find((g) => g.name === "Breville Barista Express")?.id ?? null
  const [recipe] = await db
    .insert(schema.recipes)
    .values({
      name: "Breville Espresso",
      brewingMethod: "espresso",
      defaultDoseGrams: "18",
      notes: "Default espresso recipe using Breville Barista Express",
    })
    .returning()
  console.log(`    ✓ Recipe: ${recipe.name}`)

  if (brevilleId) {
    await db.insert(schema.recipeGear).values({ recipeId: recipe.id, gearId: brevilleId })
    console.log(`    ✓ Linked Breville to recipe`)
  }

  console.log("  → Inserting shots...")
  const baseDate = new Date("2026-01-01T08:00:00")
  let fakeDateIndex = 0
  
  const shotsData = IMPORTED_SHOTS.filter((shot) => {
    const dbBeanId = beanIdMap.get(shot.bean_id)
    return dbBeanId !== undefined
  }).map((shot) => {
    const parsedDate = parseDate(shot.date)
    let createdAt: Date
    if (parsedDate) {
      createdAt = parsedDate
    } else {
      createdAt = new Date(baseDate.getTime() + fakeDateIndex * 24 * 60 * 60 * 1000)
      fakeDateIndex++
    }
    return {
      beanId: beanIdMap.get(shot.bean_id)!,
      recipeId: recipe.id,
      doseGrams: shot.dose_grams?.toString() ?? null,
      yieldGrams: shot.yield_grams?.toString() ?? null,
      brewTimeSeconds: shot.brew_time_seconds ? Math.round(shot.brew_time_seconds) : null,
      grindSetting: shot.grind_setting,
      notes: [shot.basket ? `Basket: ${shot.basket}` : null, shot.notes].filter(Boolean).join(" | ") || null,
      createdAt,
    }
  })

  const insertedShots = await db.insert(schema.shots).values(shotsData).returning()
  console.log(`    ✓ ${insertedShots.length} shots`)

  console.log("\n✅ Seeding complete!")
  console.log(`
Summary:
  - ${insertedTags.length} taste tags
  - ${insertedRoasters.length} roasters
  - ${insertedBeans.length} beans
  - ${imageCount} bean images
  - ${insertedGear.length} gear items
  - ${gearImageCount} gear images
  - 1 recipe
  - ${insertedShots.length} shots
`)

  await client.end()
}

seed().catch((err) => {
  console.error("Seeding failed:", err)
  process.exit(1)
})
