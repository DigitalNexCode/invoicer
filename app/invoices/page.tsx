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
import { Download } from 'lucide-react'
import { createRoot } from 'react-dom/client'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { InvoicePreview } from '@/components/invoice-preview'

interface Invoice {
  id: string
  number: string
  client_name: string
  amount: number
  status: string
  created_at: string
  due_date: string
  currency: string
}

interface DbInvoiceItem {
  id: string;
  name: string;
  description: string;
  quantity: string | number;
  unit_price: string | number;
  tax: string | number;
}

interface DbInvoice extends Invoice {
  invoice_items: DbInvoiceItem[];
  client_email: string;
  client_phone?: string;
  client_company?: string;
  description?: string;
  company_details: string;
  notes?: string;
  logo?: string;
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchInvoices = async () => {
      const { data, error } = await getSupabase()
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .returns<Invoice[]>()

      if (error) {
        console.error('Error fetching invoices:', error)
      } else {
        setInvoices(data || [])
      }
      setLoading(false)
    }

    fetchInvoices()

    // Set up real-time listener
    const subscription = getSupabase()
      .channel('invoice_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchInvoices)
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      const { error } = await getSupabase()
        .from('invoices')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting invoice:', error)
        toast({
          title: "Error",
          description: "Failed to delete invoice. Please try again.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Success",
          description: "Invoice deleted successfully.",
        })
        router.refresh()
      }
    }
  }

  const handleDownload = async (invoiceId: string) => {
    try {
      // Fetch invoice data
      const { data: invoice, error: fetchError } = await getSupabase()
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', invoiceId)
        .single()

      if (fetchError) {
        throw new Error(`Failed to fetch invoice: ${fetchError.message}`)
      }
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      const typedInvoice = invoice as unknown as DbInvoice

      // Transform invoice items to match the expected format
      const transformedItems = Array.isArray(typedInvoice.invoice_items) 
        ? typedInvoice.invoice_items.map((item: DbInvoiceItem) => ({
            id: item.id,
            name: item.name,
            description: item.description || '',
            quantity: Number(item.quantity),
            unitPrice: Number(item.unit_price),
            tax: Number(item.tax)
          }))
        : []

      // Create and append temporary div with ID
      const tempDiv = document.createElement('div')
      tempDiv.id = 'invoice-preview'
      tempDiv.style.position = 'absolute'
      tempDiv.style.left = '-9999px'
      tempDiv.style.width = '210mm' // A4 width
      tempDiv.style.backgroundColor = 'white'
      document.body.appendChild(tempDiv)
      
      // Create root and render
      const root = createRoot(tempDiv)

      // Transform invoice data to match InvoicePreviewProps
      const previewProps = {
        clientName: typedInvoice.client_name,
        clientEmail: typedInvoice.client_email,
        clientPhone: typedInvoice.client_phone || '',
        clientCompany: typedInvoice.client_company || '',
        invoiceNumber: typedInvoice.number,
        issueDate: typedInvoice.created_at,
        dueDate: typedInvoice.due_date,
        description: typedInvoice.description || '',
        status: typedInvoice.status,
        currency: typedInvoice.currency,
        companyDetails: typedInvoice.company_details,
        notes: typedInvoice.notes || '',
        items: transformedItems,
        total: Number(typedInvoice.amount),
        showMonthly: false,
        logo: typedInvoice.logo
      }

      root.render(
        <InvoicePreview {...previewProps} />
      )

      // Wait for render and fonts to load
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Generate canvas with better settings
      const canvas = await html2canvas(tempDiv, {
        scale: 2,
        useCORS: true,
        logging: true,
        backgroundColor: '#ffffff'
      })

      const imgData = canvas.toDataURL('image/png')
      
      // Create PDF with proper dimensions
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`invoice-${typedInvoice.number}.pdf`)

      // Cleanup
      root.unmount()
      document.body.removeChild(tempDiv)
      
      toast({
        title: "Success",
        description: "PDF generated successfully",
      })
    } catch (error) {
      console.error('Error generating PDF:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        error: error,
        stack: error instanceof Error ? error.stack : undefined
      })
      
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to generate PDF: ${error.message}`
          : "Failed to generate PDF: Unknown error",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Invoices</CardTitle>
          <Link href="/invoices/new">
            <Button>Create New Invoice</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice Number</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell>{invoice.number}</TableCell>
                  <TableCell>{invoice.client_name}</TableCell>
                  <TableCell>{formatCurrency(invoice.amount, invoice.currency)}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium
                      ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                        'bg-gray-100 text-gray-700'}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </TableCell>
                  <TableCell>{formatDate(new Date(invoice.created_at))}</TableCell>
                  <TableCell>{formatDate(new Date(invoice.due_date))}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Link href={`/invoices/${invoice.id}`}>
                        <Button variant="outline" size="sm">View</Button>
                      </Link>
                      <Link href={`/invoices/${invoice.id}/edit`}>
                        <Button variant="outline" size="sm">Edit</Button>
                      </Link>
                      <Button variant="destructive" size="sm" onClick={() => handleDelete(invoice.id)}>Delete</Button>
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

