export async function signOutOfAccount() {
  const { openEditionJournal } = await import('@/journal/local/edition')
  const { listPendingChanges } = await import('@/journal/local/sync')
  const journal = await openEditionJournal().catch(() => undefined)
  if (journal && (await listPendingChanges(journal)).length)
    throw new Error('Sync or discard your pending changes before signing out.')

  const { authClient } = await import('@/lib/auth-client')
  const result = await authClient.signOut()
  if (result.error)
    throw new Error(result.error.message ?? 'Could not sign out. Try again.')

  try {
    // This account's journal leaves the device with the session.
    if (journal) {
      const { deleteLocalJournal } = await import('@/journal/local/client')
      await deleteLocalJournal(journal)
    }
    localStorage.removeItem('roastbook-active-owner')
    if ('caches' in window)
      for (const key of await caches.keys())
        if (key.startsWith('roastbook-documents-')) await caches.delete(key)
  } finally {
    window.location.replace('/login')
  }
}
