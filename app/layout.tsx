import './globals.css'
import AuthenticatedLayout from './components/authenticated-layout'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AuthenticatedLayout>
          {children}
        </AuthenticatedLayout>
      </body>
    </html>
  )
}

