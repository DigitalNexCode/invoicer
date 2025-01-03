'use client'

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useState, useRef } from "react"
import { getSupabase } from "@/lib/supabase-client"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InvoicePreview } from "./invoice-preview"
import { ItemInput } from "./item-input"
import { LogoUpload } from "./logo-upload"
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const invoiceSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientEmail: z.string().email("Invalid email address"),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  description: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  currency: z.string().min(1, "Currency is required"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  companyDetails: z.string().min(1, "Company details are required"),
  notes: z.string().optional()
})

export interface InvoiceItem {
  id?: string
  name: string
  description: string
  quantity: number
  unitPrice: number
  tax: number
}

export function NewInvoicePage({ 
  initialData = null, 
  mode = 'create' 
}: { 
  initialData?: any, 
  mode?: 'create' | 'edit' 
}) {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [items, setItems] = useState<InvoiceItem[]>(initialData?.invoice_items || [])
  const [showMonthly, setShowMonthly] = useState(false)
  const [logo, setLogo] = useState<string | undefined>(initialData?.logo || undefined)
  const invoicePreviewRef = useRef<HTMLDivElement>(null)

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: initialData || {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientCompany: "",
      invoiceNumber: "",
      description: "",
      status: "draft",
      currency: "USD",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      companyDetails: "",
      notes: ""
    },
  })

  const watchedFields = form.watch()

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((total, item) => {
      const itemTotal = item.quantity * item.unitPrice
      return total + itemTotal + (itemTotal * item.tax / 100)
    }, 0)
  }

  const handleItemsChange = (newItems: InvoiceItem[]) => {
    setItems(newItems)
  }

  const generateAndDownloadPDF = async (invoiceId: unknown) => {
    if (typeof invoiceId !== 'string') return;
    if (!invoicePreviewRef.current) return;

    try {
      const canvas = await html2canvas(invoicePreviewRef.current);
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoiceId}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  async function onSubmit(values: z.infer<typeof invoiceSchema>) {
    setIsSubmitting(true)
    try {
      const supabase = getSupabase()
      
      // Test database connection first
      try {
        const { error: connectionError } = await supabase.from('invoices').select('count').limit(0)
        if (connectionError) {
          console.error('Database connection test failed:', connectionError)
          throw new Error(`Database connection failed: ${connectionError.message}`)
        }
      } catch (connError) {
        console.error('Connection test error:', connError)
        throw new Error('Failed to connect to database. Please check your internet connection.')
      }

      // Validate form data
      if (!values.clientName || !values.clientEmail || !values.invoiceNumber) {
        const missingFields = [];
        if (!values.clientName) missingFields.push('Client Name');
        if (!values.clientEmail) missingFields.push('Client Email');
        if (!values.invoiceNumber) missingFields.push('Invoice Number');
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }
      
      if (mode === 'edit' && initialData) {
        console.log('Updating invoice with ID:', initialData.id)
        const { error: invoiceError } = await supabase
          .from('invoices')
          .update({
            client_name: values.clientName,
            client_email: values.clientEmail,
            client_phone: values.clientPhone,
            client_company: values.clientCompany,
            number: values.invoiceNumber,
            description: values.description,
            status: values.status,
            currency: values.currency,
            amount: calculateTotal(items),
            created_at: values.issueDate,
            due_date: values.dueDate,
            company_details: values.companyDetails,
            notes: values.notes,
            logo: logo,
            user_id: (await supabase.auth.getUser()).data.user?.id
          })
          .eq('id', initialData.id)

        if (invoiceError) {
          console.error('Error updating invoice:', {
            code: invoiceError.code,
            message: invoiceError.message,
            details: invoiceError.details,
            hint: invoiceError.hint
          })
          throw new Error(`Failed to update invoice: ${invoiceError.message}`)
        }

        console.log('Deleting existing invoice items for invoice:', initialData.id)
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', initialData.id)

        if (deleteError) {
          console.error('Error deleting invoice items:', {
            code: deleteError.code,
            message: deleteError.message,
            details: deleteError.details,
            hint: deleteError.hint
          })
          throw new Error(`Failed to delete existing invoice items: ${deleteError.message}`)
        }

        console.log('Inserting new invoice items for invoice:', initialData.id)
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(items.map(item => ({
            invoice_id: initialData.id,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax: item.tax
          })))

        if (itemsError) {
          console.error('Error inserting invoice items:', {
            code: itemsError.code,
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint
          })
          throw new Error(`Failed to insert invoice items: ${itemsError.message}`)
        }
      } else {
        console.log('Creating new invoice with data:', {
          clientName: values.clientName,
          invoiceNumber: values.invoiceNumber,
          itemsCount: items.length
        })

        const { data: userData, error: userError } = await supabase.auth.getUser()
        if (userError) {
          console.error('Error getting user:', userError)
          throw new Error('Failed to get user information')
        }

        if (!userData.user?.id) {
          throw new Error('No user ID found. Please log in again.')
        }

        const { data: savedInvoice, error: invoiceError } = await supabase
          .from('invoices')
          .insert({
            client_name: values.clientName,
            client_email: values.clientEmail,
            client_phone: values.clientPhone,
            client_company: values.clientCompany,
            number: values.invoiceNumber,
            description: values.description,
            status: values.status,
            currency: values.currency,
            amount: calculateTotal(items),
            created_at: values.issueDate,
            due_date: values.dueDate,
            company_details: values.companyDetails,
            notes: values.notes,
            logo: logo,
            user_id: userData.user.id
          })
          .select()
          .single()

        if (invoiceError) {
          console.error('Error creating invoice:', {
            code: invoiceError.code,
            message: invoiceError.message,
            details: invoiceError.details,
            hint: invoiceError.hint
          })
          throw new Error(`Failed to create invoice: ${invoiceError.message}`)
        }

        if (!savedInvoice) {
          throw new Error('No invoice data returned after creation')
        }

        console.log('Invoice created successfully:', savedInvoice.id)

        console.log('Inserting invoice items for new invoice:', savedInvoice.id)
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map(item => ({
              invoice_id: savedInvoice.id,
              name: item.name,
              description: item.description,
              quantity: item.quantity,
              unit_price: item.unitPrice,
              tax: item.tax
            }))
          )

        if (itemsError) {
          console.error('Error inserting invoice items:', {
            code: itemsError.code,
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint
          })
          throw new Error(`Failed to insert invoice items: ${itemsError.message}`)
        }

        console.log('Invoice items inserted successfully')

        try {
          await generateAndDownloadPDF(savedInvoice.id)
          console.log('PDF generated and downloaded successfully')
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError)
          // Don't throw here, as the invoice is already saved
          toast({
            title: "Warning",
            description: "Invoice saved but PDF generation failed. You can download it later.",
            variant: "destructive",
          })
        }
      }

      toast({
        title: "Success",
        description: `Invoice ${mode === 'edit' ? 'updated' : 'created'} successfully.`,
      })
      
      router.push('/invoices')
    } catch (error) {
      console.error('Error saving invoice:', error)
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Error saving invoice: ${error.message}` 
          : "An unexpected error occurred while saving the invoice",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>{mode === 'edit' ? 'Edit Invoice' : 'Create New Invoice'}</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {/* Add all other form fields similarly */}
                <div className="flex items-center space-x-2">
                  <Switch
                    id="show-monthly"
                    checked={showMonthly}
                    onCheckedChange={setShowMonthly}
                  />
                  <Label htmlFor="show-monthly">Show Monthly Amount</Label>
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Logo</h2>
                  <LogoUpload onLogoChange={setLogo} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold mb-2">Items</h2>
                  <ItemInput 
                    items={items} 
                    onItemsChange={handleItemsChange} 
                    currency={watchedFields.currency} 
                    showMonthly={showMonthly} 
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Total:</span>
                  <span className="text-xl font-bold">
                    {watchedFields.currency} {calculateTotal(items).toFixed(2)}
                  </span>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 
                    (mode === 'edit' ? "Updating Invoice..." : "Creating Invoice...") : 
                    (mode === 'edit' ? "Update Invoice" : "Create Invoice")
                  }
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Invoice Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={invoicePreviewRef}>
              <InvoicePreview 
                {...watchedFields} 
                items={items} 
                total={calculateTotal(items)} 
                showMonthly={showMonthly} 
                logo={logo}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 