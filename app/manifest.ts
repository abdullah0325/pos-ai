import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AL FAROOQ FOODS',
    short_name: 'AL FAROOQ FOODS',
    description: 'Offline-first business management for AL FAROOQ FOODS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f7f5',
    theme_color: '#7CB518',
    orientation: 'portrait-primary',
    icons: [
      { src: '/icon.svg', sizes: '512x512', type: 'image/svg+xml' },
      { src: '/al-farooq-foods-logo.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
