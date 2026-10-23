
const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://chrysalis-hydroponics.onrender.com'
).replace(/\/+$/, '')

export async function getApiHealth() {
  const response = await fetch(`${apiBaseUrl}/api/health`, {
    cache: 'no-store',
  })

  if (!response.ok) throw new Error('API health request failed')

  return response.json() as Promise<{
    ok: boolean
    service: string
    environment: string
  }>
}

export { apiBaseUrl }
