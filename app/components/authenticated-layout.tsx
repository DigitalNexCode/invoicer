'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { Sidebar } from '@/components/sidebar'
import { toast } from "@/components/ui/use-toast"

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [mounted, setMounted] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    setMounted(true)
  }, [])

  const getSupabaseClient = useCallback(() => {
    return getSupabase()
  }, [])

  const checkAuth = useCallback(async () => {
    if (!mounted) return
    try {
      const supabase = getSupabaseClient()
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)

      if (!session && !['/', '/login', '/signup'].includes(pathname)) {
        router.push('/login')
      }
    } catch (err) {
      console.error('Error checking auth:', err)
      setError('Failed to initialize Supabase. Please check your environment variables.')
      toast({
        title: "Error",
        description: "Failed to initialize Supabase. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [getSupabaseClient, pathname, router, mounted])

  const setupAuthListener = useCallback(async () => {
    if (!mounted) return null
    try {
      const supabase = getSupabaseClient()
      const { data } = await supabase.auth.onAuthStateChange((event, session) => {
        setIsAuthenticated(!!session)
        if (!session && !['/', '/login', '/signup'].includes(pathname)) {
          router.push('/login')
        }
      })
      
      return data
    } catch (err) {
      console.error('Error setting up auth listener:', err)
      setError('Failed to set up authentication listener. Please try again later.')
      toast({
        title: "Error",
        description: "Failed to set up authentication listener. Please try again later.",
        variant: "destructive",
      })
      return null
    }
  }, [getSupabaseClient, pathname, router, mounted])

  useEffect(() => {
    if (mounted) {
      checkAuth()

      let authListenerCleanup: (() => void) | undefined

      setupAuthListener().then((data) => {
        if (data && typeof data.subscription?.unsubscribe === 'function') {
          authListenerCleanup = data.subscription.unsubscribe
        }
      })

      return () => {
        if (authListenerCleanup) {
          authListenerCleanup()
        }
      }
    }
  }, [checkAuth, setupAuthListener, mounted])

  if (!mounted) return null
  if (isLoading) return <div>Loading...</div>
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error</h1>
          <p>{error}</p>
          <p className="mt-4">Please check your environment variables and try again.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {isAuthenticated && !['/', '/login', '/signup'].includes(pathname) ? (
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      ) : (
        children
      )}
    </>
  )
} 