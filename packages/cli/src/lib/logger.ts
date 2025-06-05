import type { Context, Next } from 'hono'

export const combinedLogger = async (c: Context, next: Next) => {
 const start = Date.now()
 await next()
 const ms = Date.now() - start
 // ...rest as before
 const req = c.req
 const res = c.res
 const remoteAddr = req.header('x-forwarded-for') ?? req.header('x-real-ip') ?? '::1'
 const userAgent = req.header('user-agent') ?? '-'
 const referer = req.header('referer') ?? '-'
 const now = new Date()
 const date = now.toISOString().replace('T', ' ').replace('Z', '')
 const method = req.method
 const url = req.url
 const httpVersion = '1.1'
 const status = res.status
 const contentLength = res.headers.get('content-length') ?? '-'
 const log = `${remoteAddr} - - [${date}] "${method} ${url} HTTP/${httpVersion}" ${status} ${contentLength} "${referer}" "${userAgent}" ${ms}ms`
  
 console.log(log)
}