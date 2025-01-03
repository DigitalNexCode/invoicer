'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import NewQuotePage from '../../new/page'
import { toast } from "@/components/ui/use-toast"

interface QuoteData {
  client_name: string
  client_email: string
  client_phone: string | null
  client_company: string | null
  number: string
  created_at: string
  expiry_date: string
  description: string | null
  status: string
  currency: string
  company_details: string
  notes: string | null
  logo: string | null
}

interface QuoteItem {
  id: string
  name: string | null
  item_description: string
  quantity: number
  unit_price: number
}

export interface FormattedQuoteData {
  clientName: string
  clientEmail: string
  clientPhone: string
  clientCompany: string
  quoteNumber: string
  issueDate: string
  expiryDate: string
  description: string
  status: "draft" | "sent" | "accepted" | "rejected"
  currency: string
  companyDetails: string
  notes: string
  items: Array<{
    id: string
    name: string
    description: string
    quantity: number
    unitPrice: number
    tax: number
  }>
  logo: string | null
}

export default function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [quoteData, setQuoteData] = useState<FormattedQuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        // Fetch quote data
        const { data: quote, error: quoteError } = await getSupabase()
          .from('quotes')
          .select('*')
          .eq('id', resolvedParams.id)
          .single()

        if (quoteError) {
          throw quoteError
        }

        if (!quote) {
          throw new Error('Quote not found')
        }

        // Fetch quote items
        const { data: items, error: itemsError } = await getSupabase()
          .from('quote_items')
          .select('*')
          .eq('quote_id', resolvedParams.id)

        if (itemsError) {
          throw itemsError
        }

        // Format the data to match the form structure
        const formattedData: FormattedQuoteData = {
          clientName: quote.client_name as string,
          clientEmail: quote.client_email as string,
          clientPhone: (quote.client_phone as string) || '',
          clientCompany: (quote.client_company as string) || '',
          quoteNumber: quote.number as string,
          issueDate: (quote.created_at as string).split('T')[0],
          expiryDate: (quote.expiry_date as string).split('T')[0],
          description: (quote.description as string) || '',
          status: quote.status as "draft" | "sent" | "accepted" | "rejected",
          currency: quote.currency as string,
          companyDetails: quote.company_details as string,
          notes: (quote.notes as string) || '',
          items: (items || []).map(item => ({
            id: item.id as string,
            name: (item.name as string) || '',
            description: item.item_description as string,
            quantity: item.quantity as number,
            unitPrice: item.unit_price as number,
            tax: 0,
          })),
          logo: quote.logo as string | null,
        }

        setQuoteData(formattedData)
        setLoading(false)
      } catch (error) {
        console.error('Error fetching quote:', error)
        toast({
          title: "Error",
          description: "Failed to load quote data. Please try again.",
          variant: "destructive",
        })
        router.push('/quotes')
      }
    }

    fetchQuote()
  }, [resolvedParams.id, router])

  if (loading) {
    return <div>Loading...</div>
  }

  return <NewQuotePage initialData={quoteData} isEditing={true} quoteId={resolvedParams.id} />
} 