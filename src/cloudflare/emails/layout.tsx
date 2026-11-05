import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { ReactNode } from 'react'
import { color, font, site } from './brand'

export function EmailLayout({
  preview,
  title,
  action,
  tone = 'primary',
  note,
  safety,
  children,
}: {
  preview: string
  title: string
  action: { label: string; href: string }
  tone?: 'primary' | 'destructive'
  note?: string
  safety?: string
  children: ReactNode
}) {
  const accent = tone === 'destructive' ? color.destructive : color.primary
  return (
    <Html lang="en">
      <Head />
      <Preview>{preview}</Preview>
      <Body
        style={{
          margin: 0,
          background: color.background,
          color: color.foreground,
          fontFamily: font,
        }}
      >
        <Container style={{ maxWidth: 560, padding: '40px 20px' }}>
          <Section style={{ padding: '0 8px 24px' }}>
            <Link href={site.url} style={{ textDecoration: 'none' }}>
              <Img
                src={site.logo}
                width={36}
                height={36}
                alt="Roastbook"
                style={{ borderRadius: 8, display: 'inline-block' }}
              />
              <span
                style={{
                  marginLeft: 10,
                  fontSize: 24,
                  fontWeight: 800,
                  color: color.foreground,
                  verticalAlign: 'top',
                  lineHeight: '36px',
                }}
              >
                Roastbook
              </span>
            </Link>
          </Section>
          <Section
            style={{
              padding: 36,
              background: color.card,
              border: `1px solid ${color.border}`,
              borderTop: `4px solid ${accent}`,
              borderRadius: 16,
            }}
          >
            <Text
              style={{
                margin: '0 0 24px',
                fontSize: 30,
                lineHeight: '1.15',
                fontWeight: 800,
                letterSpacing: '-0.5px',
              }}
            >
              {title}
            </Text>
            {children}
            <Button
              href={action.href}
              style={{
                display: 'block',
                margin: '24px 0 16px',
                padding: '16px 24px',
                background: accent,
                color: color.primaryForeground,
                borderRadius: 999,
                fontSize: 16,
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              {action.label}
            </Button>
            {note ? <Muted>{note}</Muted> : null}
            {safety ? (
              <>
                <Hr style={{ borderColor: color.border, margin: '28px 0 20px' }} />
                <Muted>{safety}</Muted>
              </>
            ) : null}
          </Section>
          <Section style={{ padding: '24px 8px 0', textAlign: 'center' }}>
            <Text style={{ margin: 0, fontSize: 13 }}>
              {site.links.map((link, index) => (
                <span key={link.href}>
                  {index ? ' · ' : null}
                  <Link href={link.href} style={{ color: color.link }}>
                    {link.label}
                  </Link>
                </span>
              ))}
            </Text>
            <Text
              style={{ margin: '8px 0 0', fontSize: 12, color: color.mutedForeground }}
            >
              Roastbook, your coffee journal. This is an automated account email.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text style={{ margin: '0 0 16px', fontSize: 16, lineHeight: '1.65' }}>
      {children}
    </Text>
  )
}

export function Muted({ children }: { children: ReactNode }) {
  return (
    <Text style={{ margin: 0, fontSize: 14, lineHeight: '1.6', color: color.mutedForeground }}>
      {children}
    </Text>
  )
}

export function CodeBox({ code }: { code: string }) {
  return (
    <Section
      style={{
        margin: '24px 0',
        padding: '20px 8px',
        background: color.muted,
        border: `1px solid ${color.border}`,
        borderRadius: 12,
        textAlign: 'center',
      }}
    >
      <Muted>Your sign-in code</Muted>
      <Text
        style={{
          margin: '8px 0 0',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: '5px',
          fontFamily: 'Menlo, Consolas, monospace',
        }}
      >
        {code}
      </Text>
    </Section>
  )
}
