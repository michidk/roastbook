export async function signOutOfAccount() {
  const { listOperations } = await import('@/modules/offline/operation-queue')
  const pending = (await listOperations()).some(
    (item) => !['acknowledged', 'cancelled'].includes(item.status),
  )
  const { getClientJournal } = await import('@/lib/client/local-journal')
  const journal = await getClientJournal()
  if (pending || (await journal.read()).pending.length)
    throw new Error('Sync or discard your pending changes before signing out.')

  const { deleteOfflineDatabase } = await import('@/modules/offline/storage')
  await journal.remove()
  await deleteOfflineDatabase()
  const { authClient } = await import('@/lib/auth-client')
  const result = await authClient.signOut()
  if (result.error)
    throw new Error(result.error.message ?? 'Could not sign out. Try again.')

  try {
    localStorage.removeItem('roastbook-active-owner')
    if ('caches' in window)
      for (const key of await caches.keys())
        if (key.startsWith('roastbook-documents-')) await caches.delete(key)
  } finally {
    window.location.replace('/login')
  }
}
