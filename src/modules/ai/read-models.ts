import type {
  AUTO_STOP_MODE_VALUES,
  BEAN_TYPE_VALUES,
  PROCESS_METHOD_VALUES,
  ROAST_LEVEL_VALUES,
} from '@/lib/domain-contracts'

export type ExtractedRoasterInfo = Partial<{
  name: string
  location: string
  country: string
  website: string
  instagramHandle: string
  notes: string
}>

export type ExtractedBeanInfo = Partial<{
  name: string
  roaster: string
  type: (typeof BEAN_TYPE_VALUES)[number]
  origin: string
  region: string
  farm: string
  variety: string
  process: (typeof PROCESS_METHOD_VALUES)[number]
  roastLevel: (typeof ROAST_LEVEL_VALUES)[number]
  roastDate: string
  notes: string
  roasterLocation: string
  roasterCountry: string
  roasterWebsite: string
  roasterInstagramHandle: string
}>

export type ExtractedMachineSettings = Partial<{
  brewPressureOpvBar: string
  supportsPreinfusion: boolean
  defaultPreinfusionEnabled: boolean
  defaultPreinfusionTimeSeconds: string
  defaultPreinfusionPressureBar: string
  defaultFlowLimitMlPerSecond: string
  temperatureOffsetCelsius: string
  volumetricShotVolumeMl: string
  autoStopMode: (typeof AUTO_STOP_MODE_VALUES)[number]
  steamTemperatureCelsius: string
  steamPressureBar: string
}>
