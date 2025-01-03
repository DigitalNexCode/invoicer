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
import { formatCurrency, formatDate } from "@/lib/utils"
import { toast } from "@/components/ui/use-toast"

interface Quote {
  id: string
  number: string
  client_name: string
  amount: number
  status: string
  created_at: string
  expiry_date: string
}

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchQuotes = async () => {
      const { data, error } = await getSupabase()
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<Quote[]>()

      if (error) {
        console.error('Error fetching quotes:', error)
      } else {
        setQuotes(data || [])
      }
      setLoading(false)
    }

    fetchQuotes()

    // Set up real-time listener
    const subscription = getSupabase()
      .channel('quote_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'quotes' }, fetchQuotes)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this quote?')) {
      const { error } = await getSupabase()
        .from('quotes')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting quote:', error)
        toast({
          title: "Error",
          description: "Failed to delete quote. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Quote deleted successfully.",
        })
        router.refresh()
      }
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Quotes</CardTitle>
          <Link href="/quotes/new">
            <Button>Create New Quote</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quote Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Expiry Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quotes.map((quote) => (
                <TableRow key={quote.id}>
                  <TableCell>{quote.number}</TableCell>
                  <TableCell>{quote.client_name}</TableCell>
                  <TableCell>R {quote.amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      ${quote.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                        quote.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        quote.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'}`}>
                      {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(new Date(quote.created_at))}</TableCell>
                  <TableCell>{formatDate(new Date(quote.expiry_date))}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/quotes/${quote.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/quotes/${quote.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(quote.id)}>Delete</Button>
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

