import { createServer } from 'node:net'

/** A local SMTP sink exercises Nodemailer's real transport without external mail. */
export async function startAuthEmailFixture() {
  const messages: { to: string; text: string }[] = []
  const server = createServer((socket) => {
    socket.write('220 localhost ESMTP\r\n')
    let buffered = ''
    let recipient = ''
    let data: string[] | null = null
    socket.on('data', (chunk) => {
      buffered += chunk.toString()
      let end = buffered.indexOf('\r\n')
      while (end >= 0) {
        const line = buffered.slice(0, end)
        buffered = buffered.slice(end + 2)
        if (data) {
          if (line === '.') {
            const raw = data.join('\r\n').replace(/=\r\n/g, '')
            const text = raw.replace(/=([\da-f]{2})/gi, (_, hex: string) =>
              String.fromCharCode(Number.parseInt(hex, 16)),
            )
            messages.push({ to: recipient, text })
            data = null
            socket.write('250 accepted\r\n')
          } else data.push(line.replace(/^\.\./, '.'))
        } else if (/^RCPT TO:/i.test(line)) {
          recipient = /<([^>]+)>/.exec(line)?.[1] ?? ''
          socket.write('250 recipient\r\n')
        } else if (/^DATA$/i.test(line)) {
          data = []
          socket.write('354 send message\r\n')
        } else if (/^QUIT$/i.test(line)) socket.end('221 goodbye\r\n')
        else socket.write('250 localhost\r\n')
        end = buffered.indexOf('\r\n')
      }
    })
  })
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (!address || typeof address === 'string')
    throw new Error('SMTP fixture must listen on TCP')
  return {
    url: `smtp://127.0.0.1:${address.port}`,
    readMessages: async () => messages,
    close: () =>
      new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      ),
  }
}
