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
  },
})
