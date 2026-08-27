export function demoCapabilityDisabled(capability: string): never {
  throw new Error(`${capability} is disabled in demo mode`)
}
