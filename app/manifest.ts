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
      { src: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
