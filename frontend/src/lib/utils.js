// "anshu.kumari@gmail.com" -> "Anshu Kumari"
export const displayName = (email = '') =>
  email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())