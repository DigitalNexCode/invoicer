'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { getSupabase } from '@/lib/supabase-client'

interface Invoice {
  id: string
  client_name: string
  amount: number
  status: string
  created_at: string
}

interface Client {
  id: string
  name: string
  email: string
  total_invoices: number
  total_amount: number
}

export default function ReportsPage() {
  const [topInvoices, setTopInvoices] = useState<Invoice[]>([])
  const [topClients, setTopClients] = useState<Client[]>([])

  useEffect(() => {
    const fetchTopInvoices = async () => {
      const { data, error } = await getSupabase()
        .from('invoices')
        .select('id, client_name, amount, status, created_at')
        .order('amount', { ascending: false })
        .limit(5)

      if (error) {
        console.error('Error fetching top invoices:', error)
      } else {
        setTopInvoices(data)
      }
    }

    const fetchTopClients = async () => {
      const { data, error } = await getSupabase()
        .from('clients')
        .select(`
          id,
          name,
          email,
          invoices!invoices_client_id_fkey (amount)
        `)

      if (error) {
        console.error('Error fetching top clients:', error)
      } else {
        const clientsWithTotals = data.map(client => ({
          id: client.id,
          name: client.name,
          email: client.email,
          total_invoices: client.invoices.length,
          total_amount: client.invoices.reduce((sum: number, inv: any) => sum + inv.amount, 0)
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5)

        setTopClients(clientsWithTotals)
      }
    }

    fetchTopInvoices()
    fetchTopClients()

    // Set up real-time listeners
    const invoiceSubscription = getSupabase()
      .channel('invoice_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchTopInvoices)
      .subscribe()

    const clientSubscription = getSupabase()
      .channel('client_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchTopClients)
      .subscribe()

    return () => {
      getSupabase().removeChannel(invoiceSubscription)
      getSupabase().removeChannel(clientSubscription)
    }
  }, [])

  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Invoices</CardTitle>
            <CardDescription>Highest value invoices</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>{invoice.client_name}</TableCell>
                    <TableCell>{invoice.amount.toFixed(2)}</TableCell>
                    <TableCell>{invoice.status}</TableCell>
                    <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Clients</CardTitle>
            <CardDescription>Clients with highest total invoice amounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Invoices</TableHead>
                  <TableHead>Total Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topClients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>{client.name}</TableCell>
                    <TableCell>{client.email}</TableCell>
                    <TableCell>{client.total_invoices}</TableCell>
                    <TableCell>{client.total_amount.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

