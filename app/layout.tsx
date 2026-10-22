import type { Metadata, Viewport } from 'next'
import './globals.css'
import './mobile.css'

export const metadata: Metadata = {
  title: 'AL FAROOQ FOODS - Business Management System',
  description: 'Offline-first business and production management for AL FAROOQ FOODS (Juices, Mineral Water, Confectionery & Snacks).',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/al-farooq-foods-logo.png', type: 'image/png' },
    ],
    apple: '/al-farooq-foods-logo.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#7CB518',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: true,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background">
      <head>
        <link rel="apple-touch-icon" href="/apple-icon.png" />
      </head>
      {/* Browser extensions such as Grammarly can add body attributes before hydration. */}
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol === 'https:' && window.location.hostname !== 'localhost') {
                window.addEventListener('load', function() {
                  try {
                    navigator.serviceWorker.register('/sw.js').catch(function(e) {
                      console.log('SW registration note:', e);
                    });
                  } catch (e) {}
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
