import type { Metadata, Viewport } from 'next'
import './globals.css'
import './mobile.css'
import './smart-entry.css'

export const metadata: Metadata = {
  title: 'Al Farooq Hardware POS',
  description: 'Online hardware store POS, inventory, purchases and sales.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/hardware-logo.svg', type: 'image/svg+xml' },
    ],
    apple: '/hardware-logo.svg',
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
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                  for (const registration of registrations) {
                    if (new URL(registration.scope).origin === location.origin) registration.unregister();
                  }
                }).catch(() => {});
                caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('al-farooq')).map(key => caches.delete(key)))).catch(() => {});
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
