const API_URL = import.meta.env.VITE_API_URL || ''

export async function api(path, { method = 'GET', body } = {}) {
  const isForm = body instanceof FormData

  const res = await fetch(`${API_URL}/api${path}`, {
    method,
    headers: body && !isForm
      ? { 'Content-Type': 'application/json' }
      : undefined,
    body: body
      ? (isForm ? body : JSON.stringify(body))
      : undefined,
    credentials: 'include',
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = Array.isArray(data.detail)
      ? 'Please check the values you entered'
      : data.detail

    throw new Error(msg || 'Something went wrong')
  }

  return data
}
