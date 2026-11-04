import type { Plugin } from 'vite'
import { checkBrowserModule, checkProductModule } from './journal-boundaries'

export function journalBoundaries(demo: boolean): Plugin {
  return {
    name: 'roastbook-journal-boundaries',
    generateBundle(_options, bundle) {
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue
        for (const [id, module] of Object.entries(chunk.modules)) {
          if (module.renderedLength === 0) continue
          const failure =
            (!demo && checkProductModule(id)) ||
            (this.environment.name === 'client' && checkBrowserModule(id, demo))
          if (failure)
            this.error(
              `${failure} (${module.renderedLength} emitted bytes in ${chunk.fileName})`,
            )
        }
      }
    },
  }
}
