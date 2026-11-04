import { plugin } from 'bun'
import { AI_PRICING_MODULE, aiPricingModule } from './ai-pricing'

// Bun runs tests and scripts without Vite; give it the same generated modules.
plugin({
  name: 'roastbook-generated-modules',
  setup(build) {
    build.module(AI_PRICING_MODULE, () => ({
      contents: aiPricingModule(),
      loader: 'js',
    }))
    // Browser-runtime tests use the browser platform, like the client build.
    // Bun skips onResolve for path aliases, so the server modules re-export.
    if (process.env.JOURNAL_PLATFORM === 'browser')
      build.onLoad(
        {
          filter:
            /\/src\/journal\/platform\/(clock|config|database|effects|images|runtime|storage)\.ts$/,
        },
        (args) => ({
          contents: `export * from ${JSON.stringify(args.path.replace(/\.ts$/, '.browser.ts'))}`,
          loader: 'ts',
        }),
      )
  },
})
