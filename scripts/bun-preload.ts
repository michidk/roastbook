import { plugin } from 'bun'

// Bun runs tests and scripts without Vite; give it the same platform modules.
plugin({
  name: 'roastbook-journal-platform',
  setup(build) {
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
