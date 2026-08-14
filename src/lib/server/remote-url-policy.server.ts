import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'

export class RemoteUrlPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemoteUrlPolicyError'
  }
}

function ipv4Octets(address: string): readonly number[] {
  return address.split('.').map(Number)
}

function isNonPublicIpv4(address: string): boolean {
  const [first, second, third] = ipv4Octets(address)
  if (first === undefined || second === undefined || third === undefined) {
    return true
  }

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
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

  return (
    normalized === '::' ||
    normalized === '::1' ||
    normalized.startsWith('fc') ||
    normalized.startsWith('fd') ||
    /^fe[89ab]/.test(normalized) ||
    normalized.startsWith('ff') ||
    normalized.startsWith('2001:db8:')
  )
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
