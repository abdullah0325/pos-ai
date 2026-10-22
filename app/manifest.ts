import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AL FAROOQ HARDWARE',
    short_name: 'AL FAROOQ HARDWARE',
    description: 'Online hardware store POS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f5',
    theme_color: '#7CB518',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/hardware-logo.svg', sizes: 'any', type: 'image/svg+xml' },
    ],
  }
}
