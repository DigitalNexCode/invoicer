'use client'

import { useEffect, useState, use, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { InvoicePreview } from '@/components/invoice-preview'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import { toast } from "@/components/ui/use-toast"
import { Download } from 'lucide-react'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { getSupabase } from '@/lib/supabase-client'
import type { InvoiceItem as FormInvoiceItem } from '@/components/new-invoice-page'

interface DbInvoiceItem {
  id: string;
  name: string;
  description: string | null;
  quantity: number | string;
  unit_price: number | string;
  tax: number | string;
}

interface DbInvoice extends Omit<Invoice, 'invoice_items'> {
  invoice_items?: DbInvoiceItem[];
}

interface ViewInvoice extends Omit<Invoice, 'invoice_items'> {
  invoice_items: FormInvoiceItem[];
}

interface Invoice {
  id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string;
  number: string;
  description?: string;
  status: string;
  currency: string;
  amount: number;
  created_at: string;
  due_date: string;
  company_details: string;
  notes?: string;
  logo?: string;
  invoice_items?: DbInvoiceItem[];
}

export default function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const [invoice, setInvoice] = useState<ViewInvoice | null>(null)
  const router = useRouter()
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const invoicePreviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        console.log('Debug: Starting invoice fetch for ID:', resolvedParams.id);

        if (!resolvedParams.id) {
          throw new Error('No invoice ID provided');
        }

        const supabase = getSupabase();

        // Check if user is authenticated
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          console.error('Authentication error:', userError);
          throw new Error('Authentication failed. Please log in again.');
        }

        if (!user) {
          throw new Error('No authenticated user found. Please log in.');
        }

        // Now fetch the invoice with detailed error logging
        const { data, error } = await supabase
          .from('invoices')
          .select(`
            *,
            invoice_items (
              id,
              name,
              description,
              quantity,
              unit_price,
              tax
            )
          `)
          .eq('id', resolvedParams.id)
          .eq('user_id', user.id)
          .single<DbInvoice>();

        // Log the complete response for debugging
        console.log('Debug: Complete Supabase Response:', {
          data: data,
          error: error ? {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          } : null
        });

        if (error) {
          if (error.code === 'PGRST116') {
            throw new Error('Invoice not found or you do not have permission to view it.');
          }
          console.error('Supabase error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint,
            query: `invoices/${resolvedParams.id}`
          });
          throw new Error(`Database error: ${error.message}`);
        }

        if (!data) {
          throw new Error('Invoice not found');
        }

        // Transform invoice items to match the expected format
        const { invoice_items, ...rest } = data;
        const transformedData: ViewInvoice = {
          ...rest,
          invoice_items: invoice_items?.map((item: DbInvoiceItem) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            tax: Number(item.tax)
          })) || []
        };

        setInvoice(transformedData);
      } catch (error) {
        console.error('Error fetching invoice:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch invoice",
          variant: "destructive",
        });
        router.push('/invoices');
      }
    };

    fetchInvoice();
  }, [resolvedParams.id, router]);

  const handleDownload = async () => {
    if (!invoice || !invoicePreviewRef.current) return;

    try {
      const canvas = await html2canvas(invoicePreviewRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoice.number}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-10">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-2xl font-bold">Invoice Details</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push('/invoices')}>
                Back to Invoices
              </Button>
              {invoice && (
                <>
                  <Link href={`/invoices/${invoice.id}/edit`}>
                    <Button variant="outline">Edit Invoice</Button>
                  </Link>
                  <Button onClick={handleDownload}>Download PDF</Button>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div ref={invoicePreviewRef}>
              {invoice ? (
                <InvoicePreview
                  clientName={invoice.client_name}
                  clientEmail={invoice.client_email}
                  clientPhone={invoice.client_phone}
                  clientCompany={invoice.client_company}
                  invoiceNumber={invoice.number}
                  issueDate={invoice.created_at}
                  dueDate={invoice.due_date}
                  description={invoice.description}
                  status={invoice.status}
                  currency={invoice.currency}
                  companyDetails={invoice.company_details}
                  notes={invoice.notes}
                  items={invoice.invoice_items}
                  total={invoice.amount}
                  showMonthly={false}
                  logo={invoice.logo}
                />
              ) : (
                <div>Loading...</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 