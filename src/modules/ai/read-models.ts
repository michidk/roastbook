import type {
  AUTO_STOP_MODE_VALUES,
  BEAN_TYPE_VALUES,
  GEAR_PROPERTY_SOURCE_KIND_VALUES,
  MACHINE_FLOW_CONTROL_VALUES,
  MACHINE_HEATING_ARCHITECTURE_VALUES,
  MACHINE_PREINFUSION_CONTROL_VALUES,
  MACHINE_PRESSURE_CONTROL_VALUES,
  MACHINE_PUMP_TYPE_VALUES,
  MACHINE_STEAM_SYSTEM_VALUES,
  MACHINE_TEMPERATURE_CONTROL_VALUES,
  MACHINE_WATER_SOURCE_VALUES,
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

export const MACHINE_RESEARCH_PROPERTY_KEYS = [
  'specifications.portafilterDiameterMm',
  'specifications.heatingArchitecture',
  'specifications.temperatureControl',
  'specifications.pressureControl',
  'specifications.flowControl',
  'specifications.preinfusionControl',
  'specifications.shotStopModes',
  'specifications.steamSystem',
  'specifications.simultaneousBrewAndSteam',
  'specifications.groupCount',
  'specifications.pumpType',
  'specifications.waterSourceModes',
  'specifications.brewPressureMinimumBar',
  'specifications.brewPressureMaximumBar',
  'specifications.brewTemperatureMinimumCelsius',
  'specifications.brewTemperatureMaximumCelsius',
  'factorySettings.brewPressureBar',
  'factorySettings.preinfusionEnabled',
  'factorySettings.preinfusionTimeSeconds',
  'factorySettings.preinfusionPressureBar',
  'factorySettings.flowLimitMlPerSecond',
  'factorySettings.brewTemperatureOffsetCelsius',
  'factorySettings.programmedVolumeMl',
  'factorySettings.defaultStopMode',
  'factorySettings.steamTemperatureCelsius',
  'factorySettings.steamPressureBar',
] as const

export type MachineResearchPropertyKey =
  (typeof MACHINE_RESEARCH_PROPERTY_KEYS)[number]

export type MachineResearchEvidence = {
  readonly propertyKey: MachineResearchPropertyKey
  readonly sourceUrl: string
  readonly sourceTitle?: string
  readonly sourceKind: (typeof GEAR_PROPERTY_SOURCE_KIND_VALUES)[number]
  readonly rawValue?: string
  readonly rawUnit?: string
}

export type ExtractedMachineResearch = Partial<{
  specifications: Partial<{
    portafilterDiameterMm: string
    heatingArchitecture: (typeof MACHINE_HEATING_ARCHITECTURE_VALUES)[number]
    temperatureControl: (typeof MACHINE_TEMPERATURE_CONTROL_VALUES)[number]
    pressureControl: (typeof MACHINE_PRESSURE_CONTROL_VALUES)[number]
    flowControl: (typeof MACHINE_FLOW_CONTROL_VALUES)[number]
    preinfusionControl: (typeof MACHINE_PREINFUSION_CONTROL_VALUES)[number]
    shotStopModes: Array<(typeof AUTO_STOP_MODE_VALUES)[number]>
    steamSystem: (typeof MACHINE_STEAM_SYSTEM_VALUES)[number]
    simultaneousBrewAndSteam: boolean
    groupCount: number
    pumpType: (typeof MACHINE_PUMP_TYPE_VALUES)[number]
    waterSourceModes: Array<(typeof MACHINE_WATER_SOURCE_VALUES)[number]>
    brewPressureMinimumBar: string
    brewPressureMaximumBar: string
    brewTemperatureMinimumCelsius: string
    brewTemperatureMaximumCelsius: string
  }>
  factorySettings: Partial<{
    brewPressureBar: string
    preinfusionEnabled: boolean
    preinfusionTimeSeconds: string
    preinfusionPressureBar: string
    flowLimitMlPerSecond: string
    brewTemperatureOffsetCelsius: string
    programmedVolumeMl: string
    defaultStopMode: (typeof AUTO_STOP_MODE_VALUES)[number]
    steamTemperatureCelsius: string
    steamPressureBar: string
  }>
  evidence: MachineResearchEvidence[]
}>
