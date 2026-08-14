import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export class RemoteUrlPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemoteUrlPolicyError'
  }
}

interface Ipv4Range {
  readonly network: number
  readonly mask: number
}

function ipv4ToInteger(address: string): number {
  return (
    address
      .split('.')
      .map(Number)
      .reduce((value, octet) => (value << 8) | octet, 0) >>> 0
  )
}

function ipv4Range(network: string, prefixLength: number): Ipv4Range {
  const mask = (0xffffffff << (32 - prefixLength)) >>> 0
  return { network: (ipv4ToInteger(network) & mask) >>> 0, mask }
}

const NON_PUBLIC_IPV4_RANGES = [
  ipv4Range('0.0.0.0', 8),
  ipv4Range('10.0.0.0', 8),
  ipv4Range('100.64.0.0', 10),
  ipv4Range('127.0.0.0', 8),
  ipv4Range('169.254.0.0', 16),
  ipv4Range('172.16.0.0', 12),
  ipv4Range('192.0.0.0', 24),
  ipv4Range('192.0.2.0', 24),
  ipv4Range('192.168.0.0', 16),
  ipv4Range('198.18.0.0', 15),
  ipv4Range('198.51.100.0', 24),
  ipv4Range('203.0.113.0', 24),
  ipv4Range('224.0.0.0', 3),
  ipv4Range('240.0.0.0', 4),
] as const

function isNonPublicIpv4(address: string): boolean {
  const value = ipv4ToInteger(address)
  return NON_PUBLIC_IPV4_RANGES.some(({ network, mask }) => {
    const maskedValue = (value & mask) >>> 0
    return maskedValue === network
  })
}

const NON_PUBLIC_IPV6_ADDRESSES = new Set(['::', '::1'])
const NON_PUBLIC_IPV6_PREFIXES = ['fc', 'fd', 'ff', '2001:db8:'] as const

function isNonPublicIpv6(address: string): boolean {
  return (
    NON_PUBLIC_IPV6_ADDRESSES.has(address) ||
    NON_PUBLIC_IPV6_PREFIXES.some((prefix) => address.startsWith(prefix)) ||
    /^fe[89ab]/.test(address)
  )
}

export function isPrivateAddress(address: string): boolean {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, '')
  const version = isIP(normalized)
  if (version === 4) return isNonPublicIpv4(normalized)
  if (version !== 6) return true

  if (normalized.startsWith('::ffff:')) {
    const mappedAddress = normalized.slice('::ffff:'.length)
    return isIP(mappedAddress) !== 4 || isNonPublicIpv4(mappedAddress)
  }

  return isNonPublicIpv6(normalized)
}

type ResolveHost = (hostname: string) => Promise<readonly { address: string }[]>

const resolveHost: ResolveHost = (hostname) => lookup(hostname, { all: true })

export async function assertPublicHttpUrl(
  value: string,
  resolve: ResolveHost = resolveHost,
): Promise<URL> {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new RemoteUrlPolicyError('Enter a valid image URL')
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new RemoteUrlPolicyError('Image URLs must use HTTP or HTTPS')
  }
  if (url.username || url.password) {
    throw new RemoteUrlPolicyError('Image URLs cannot contain credentials')
  }

  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, '')
  if (hostname === 'localhost' || hostname.endsWith('.localhost')) {
    throw new RemoteUrlPolicyError('That image host is not allowed')
  }

  let addresses: readonly { address: string }[]
  try {
    addresses = isIP(hostname)
      ? [{ address: hostname }]
      : await resolve(hostname)
  } catch {
    throw new RemoteUrlPolicyError('Could not resolve the image host')
  }
  if (
    addresses.length === 0 ||
    addresses.some(({ address }) => isPrivateAddress(address))
  ) {
    throw new RemoteUrlPolicyError('That image host is not allowed')
  }

  return url
}
