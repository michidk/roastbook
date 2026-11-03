export function DemoIntegrationNotice() {
  return (
    <div
      role="status"
      className="rounded-xl border bg-card p-6 text-sm text-muted-foreground"
    >
      Integrations are unavailable in this demo. AI, MCP, device connections,
      credentials, and server synchronization require a standard Roastbook
      installation. Your demo journal and appearance changes stay in this
      browser.
    </div>
  )
}
