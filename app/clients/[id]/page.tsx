'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabase } from '@/lib/supabase-client'
import { toast } from "@/components/ui/use-toast"

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
  created_at: string
}

export default function ClientViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', resolvedParams.id)
          .single<Client>()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error('Client not found')
        }

        setClient(data)
      } catch (error) {
        console.error('Error fetching client:', error)
        toast({
          title: "Error",
          description: "Failed to load client details. Please try again.",
          variant: "destructive",
        })
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [resolvedParams.id, router])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!client) {
    return <div>Client not found</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Client Details</CardTitle>
          <div className="flex space-x-2">
            <Link href={`/clients/${client.id}/edit`}>
              <Button>Edit Client</Button>
            </Link>
            <Link href="/clients">
              <Button variant="outline">Back to Clients</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold">Name</h3>
            <p>{client.name}</p>
          </div>
          <div>
            <h3 className="font-semibold">Email</h3>
            <p>{client.email}</p>
          </div>
          <div>
            <h3 className="font-semibold">Phone</h3>
            <p>{client.phone || '-'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Company</h3>
            <p>{client.company || '-'}</p>
          </div>
          <div>
            <h3 className="font-semibold">Client Since</h3>
            <p>{new Date(client.created_at).toLocaleDateString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 