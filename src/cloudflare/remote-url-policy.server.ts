import { isIP } from 'node:net'
import { resolvePublicHost } from './public-fetch.server'

export class RemoteUrlPolicyError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RemoteUrlPolicyError'
  }
}

import { isPrivateAddress } from '@/lib/server/public-ip'

export { isPrivateAddress } from '@/lib/server/public-ip'

export type ResolvedAddress = {
  address: string
  family?: number
}

export type ResolveHost = (
  hostname: string,
) => Promise<readonly ResolvedAddress[]>

const resolveHost: ResolveHost = resolvePublicHost

export async function resolvePublicHttpUrl(
  value: string,
  resolve: ResolveHost = resolveHost,
): Promise<{ url: URL; addresses: readonly ResolvedAddress[] }> {
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

  let addresses: readonly ResolvedAddress[]
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

  return { url, addresses }
}

export async function assertPublicHttpUrl(
  value: string,
  resolve: ResolveHost = resolveHost,
): Promise<URL> {
  return (await resolvePublicHttpUrl(value, resolve)).url
}
