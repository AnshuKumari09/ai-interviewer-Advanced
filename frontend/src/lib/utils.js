// "anshu.kumari@gmail.com" -> "Anshu Kumari"
export const displayName = (email = '') =>
  email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())

// profile me naam set ho to wahi, warna email se
export const nameOf = (user) => user?.name?.trim() || displayName(user?.email)