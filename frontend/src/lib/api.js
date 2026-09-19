export async function api(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData
  const res = await fetch(`/api${path}`, {
    method,
    headers: body && !isForm ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(data.detail) ? 'Invalid email or password (min 6 chars)' : data.detail
    throw new Error(msg || 'Something went wrong')
  }
  return data
}