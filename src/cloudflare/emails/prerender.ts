// Build step: renders every template once with %%placeholders%% so the Worker
// only substitutes strings at runtime (React Email rendering exceeds the
// Workers Free CPU budget per request).
import { writeFileSync } from 'node:fs'
import { render } from '@react-email/components'
import { EMAIL_KINDS, EMAIL_VALUES, template } from './templates'

const values = Object.fromEntries(
  EMAIL_VALUES.map((name) => [name, `%%${name}%%`]),
) as Record<(typeof EMAIL_VALUES)[number], string>
const rendered: Record<string, { subject: string; html: string; text: string }> = {}
for (const kind of EMAIL_KINDS) {
  const { subject, element } = template(kind, values)
  rendered[kind] = {
    subject,
    html: await render(element),
    text: await render(element, { plainText: true }),
  }
}
writeFileSync(
  new URL('./rendered.gen.json', import.meta.url),
  `${JSON.stringify(rendered)}\n`,
)
