'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('created_at', { ascending: false })
          .returns<Client[]>()

        if (error) {
          throw error
        }

        setClients(data || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
        toast({
          title: "Error",
          description: "Failed to load clients. Please try again.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Clients</CardTitle>
          <Link href="/clients/new">
            <Button>Add New Client</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>{client.name}</TableCell>
                  <TableCell>{client.email}</TableCell>
                  <TableCell>{client.phone || '-'}</TableCell>
                  <TableCell>{client.company || '-'}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/clients/${client.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

