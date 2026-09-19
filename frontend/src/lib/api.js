export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = Array.isArray(data.detail) ? 'Invalid email or password (min 6 chars)' : data.detail
    throw new Error(msg || 'Something went wrong')
  }
  return data
}