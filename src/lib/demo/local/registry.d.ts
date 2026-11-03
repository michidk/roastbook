declare module 'demo-local-registry' {
  import type { LocalOperation } from '@/lib/demo/local/function'
  export const operations: Map<string, LocalOperation>
}
