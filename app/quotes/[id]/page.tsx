'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QuotePreview } from '@/components/quote-preview'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { toast } from "@/components/ui/use-toast"
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Supabase URL or Key is not set in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export default function QuoteViewPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [quote, setQuote] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const quotePreviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        console.log('Debug: Starting quote fetch for ID:', resolvedParams.id);

        if (!resolvedParams.id) {
          throw new Error('No quote ID provided');
        }

        // First, check if we can connect to Supabase
        const { data: testData, error: testError } = await supabase
          .from('quotes')
          .select('id')
          .limit(1);

        if (testError) {
          console.error('Supabase connection test failed:', {
            error: testError,
            message: testError.message,
            details: testError.details,
            hint: testError.hint
          });
          throw new Error('Failed to connect to database');
        }

        console.log('Debug: Supabase connection test successful');

        // Now fetch the actual quote
        const { data, error } = await supabase
          .from('quotes')
          .select(`
            *,
            quote_items (*)
          `)
          .eq('id', resolvedParams.id)
          .single();

        console.log('Debug: Supabase Response:', { data, error });

        if (error) {
          console.error('Supabase query error:', {
            error,
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(error.message || 'Failed to fetch quote');
        }

        if (!data) {
          console.error('No data returned for quote ID:', resolvedParams.id);
          throw new Error('Quote not found');
        }

        console.log('Debug: Quote fetched successfully:', {
          id: data.id,
          number: data.number,
          items: data.quote_items?.length
        });

        setQuote(data);
      } catch (err) {
        console.error('Detailed error information:', {
          error: err,
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        });
        
        toast({
          title: "Error",
          description: err instanceof Error 
            ? `Failed to load quote: ${err.message}`
            : "Failed to load quote. Please try again.",
          variant: "destructive",
        });
        
        router.push('/quotes');
      } finally {
        setLoading(false);
      }
    };

    fetchQuote();
  }, [resolvedParams.id, router]);

  const handleDownload = async () => {
    if (!quotePreviewRef.current) return

    try {
      const canvas = await html2canvas(quotePreviewRef.current, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`quote-${quote.number}.pdf`)

      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      })
    } catch (error) {
      console.error('Error generating PDF:', error)
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) return <div>Loading...</div>
  if (!quote) return <div>Quote not found</div>

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Quote {quote.number}</CardTitle>
          <div className="flex space-x-2">
            <Button onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            <Link href={`/quotes/${resolvedParams.id}/edit`}>
              <Button>Edit Quote</Button>
            </Link>
            <Link href="/quotes">
              <Button variant="outline">Back to Quotes</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div ref={quotePreviewRef}>
            <QuotePreview
              clientName={quote.client_name}
              clientEmail={quote.client_email}
              clientPhone={quote.client_phone}
              clientCompany={quote.client_company}
              quoteNumber={quote.number}
              issueDate={quote.created_at}
              expiryDate={quote.expiry_date}
              description={quote.description || ''}
              status={quote.status}
              currency={quote.currency}
              companyDetails={quote.company_details}
              notes={quote.notes}
              items={quote.quote_items}
              total={quote.amount}
              showMonthly={false}
              logo={quote.logo}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 