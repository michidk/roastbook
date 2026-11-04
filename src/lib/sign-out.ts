export async function signOutOfAccount() {
  // Only a device copy can hold changes that have not reached the account.
  const { keepsDeviceCopy } = await import('@/journal/local/device-copy')
  const journal = keepsDeviceCopy()
    ? await import('@/journal/local/edition')
        .then(({ openEditionJournal }) => openEditionJournal())
        .catch(() => undefined)
    : undefined
  const { listPendingChanges } = await import('@/journal/local/sync')
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
    // The choice belonged to this account; the installed app makes it again.
    const { setDeviceCopy } = await import('@/journal/local/device-copy')
    setDeviceCopy(false)
    if ('caches' in window)
      for (const key of await caches.keys())
        if (key.startsWith('roastbook-documents-')) await caches.delete(key)
  } finally {
    window.location.replace('/login')
  }
}
