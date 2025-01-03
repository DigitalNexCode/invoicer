'use client'

import { useEffect, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency, formatDate } from "@/lib/utils"
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface Invoice {
  id: string
  number: string
  client: string
  amount: number
  status: string
  date: string
}

export function RecentInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRecentInvoices() {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('id, number, client_name, amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5)

        if (error) {
          if (error.code === '42P01') {
            console.error('Error: The "invoices" table does not exist in the database.')
            setInvoices([])
          } else {
            console.error('Error fetching recent invoices:', error)
          }
        } else {
          setInvoices(data.map(invoice => ({
            id: invoice.id,
            number: invoice.number,
            client: invoice.client_name,
            amount: invoice.amount,
            status: invoice.status,
            date: invoice.created_at
          })))
        }
      } catch (error) {
        console.error('Unexpected error:', error)
      }
      setLoading(false)
    }

    fetchRecentInvoices()

    const subscription = supabase
      .channel('invoices_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchRecentInvoices)
      .subscribe()

    return () => {
      supabase.removeChannel(subscription)
    }
  }, [])

  if (loading) {
    return <RecentInvoices.Skeleton />
  }

  if (invoices.length === 0) {
    return <NoInvoicesMessage />
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {invoices.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell>{invoice.number}</TableCell>
            <TableCell>{invoice.client}</TableCell>
            <TableCell>R{formatCurrency(invoice.amount)}</TableCell>
            <TableCell>{invoice.status}</TableCell>
            <TableCell>{formatDate(new Date(invoice.date))}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

RecentInvoices.Skeleton = function RecentInvoicesSkeleton() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice</TableHead>
          <TableHead>Client</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[...Array(5)].map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
            <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

function NoInvoicesMessage() {
  return (
    <div className="text-center py-4">
      <p className="text-lg font-semibold mb-2">No invoices found</p>
      <p className="text-sm text-gray-500">
        It seems the invoices table doesn't exist or is empty. 
        Please make sure you've set up your Supabase database correctly.
      </p>
    </div>
  )
}

