import '@tanstack/react-start/server-only'

import {
  localhostAllowedHostnames,
  localhostAllowedOrigins,
} from '@modelcontextprotocol/server'
import { getServerEnv } from '@/lib/env.server'

export type McpConfig = {
  allowedHostnames: string[]
  allowedOrigins: string[]
}

type McpEnvironment = {
  MCP_ALLOWED_HOSTS?: string
  MCP_ALLOWED_ORIGINS?: string
}

type ApplicationUrl = string | URL | Request

function splitList(value: string | undefined) {
  return (
    value
      ?.split(',')
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  )
}

// The SDK validates Host and Origin by hostname, so accept either a bare
// hostname or a full origin URL and reduce both to the hostname.
function toHostname(entry: string) {
  return entry.includes('://') ? new URL(entry).hostname : entry.toLowerCase()
}

/**
 * Host and Origin allowlists are the DNS-rebinding defence. Requests are
 * unauthenticated, so network placement (loopback, private VPN, NetworkPolicy)
 * is what actually restricts access.
 */
export function resolveMcpConfig(environment: McpEnvironment): McpConfig {
  return {
    allowedHostnames: [
      ...new Set([
        ...localhostAllowedHostnames(),
        ...splitList(environment.MCP_ALLOWED_HOSTS).map(toHostname),
      ]),
    ],
    allowedOrigins: [
      ...new Set([
        ...localhostAllowedOrigins(),
        ...splitList(environment.MCP_ALLOWED_ORIGINS).map(toHostname),
      ]),
    ],
  }
}

function firstForwardedValue(value: string | null) {
  return value?.split(',')[0]?.trim()
}

function resolveApplicationUrl(applicationUrl: ApplicationUrl) {
  if (!(applicationUrl instanceof Request)) return new URL(applicationUrl)

  const requestUrl = new URL(applicationUrl.url)
  const forwardedProtocol = firstForwardedValue(
    applicationUrl.headers.get('x-forwarded-proto'),
  )
  const protocol =
    forwardedProtocol === 'http' || forwardedProtocol === 'https'
      ? `${forwardedProtocol}:`
      : requestUrl.protocol
  const host =
    firstForwardedValue(applicationUrl.headers.get('x-forwarded-host')) ??
    applicationUrl.headers.get('host') ??
    requestUrl.host

  return new URL(`${protocol}//${host}`)
}

/** The endpoint URL shown to the owner, derived from how they reached the app. */
export function getMcpEndpoint(applicationUrl: ApplicationUrl) {
  return new URL('/api/mcp', resolveApplicationUrl(applicationUrl).origin)
}

export function getMcpConfig() {
  return resolveMcpConfig(getServerEnv())
}
