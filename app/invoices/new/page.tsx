'use client'

import { useState, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { InvoicePreview } from '@/components/invoice-preview'
import { ItemInput, Item } from '@/components/item-input'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { LogoUpload } from '@/components/logo-upload'
import { toast } from "@/components/ui/use-toast"
import { getSupabase } from '@/lib/supabase-client'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { useRouter } from 'next/navigation'
import { ClientSelect } from '@/components/client-select'

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
}

interface DbInvoice {
  id: string;
  [key: string]: any;  // for other fields we don't need to type strictly here
}

const generateRandomNumber = () => {
  const prefix = 'INV';
  const timestamp = new Date().getTime().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${timestamp}-${random}`;
};

const generateUniqueInvoiceNumber = async (supabase: any): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const newNumber = generateRandomNumber();
    const { data, error } = await supabase
      .from('invoices')
      .select('number')
      .eq('number', newNumber)
      .single();

    if (error && error.code === 'PGRST116') {
      // PGRST116 means no rows returned, which is what we want
      return newNumber;
    }

    if (error) {
      console.error('Error checking invoice number:', error);
    }

    attempts++;
  }

  throw new Error('Failed to generate a unique invoice number after multiple attempts');
};

const invoiceSchema = z.object({
  clientName: z.string().min(1, { message: "Client name is required." }),
  clientEmail: z.string().email({ message: "Please enter a valid email address." }),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  invoiceNumber: z.string().min(1, { message: "Invoice number is required." }),
  issueDate: z.string().min(1, { message: "Issue date is required." }),
  dueDate: z.string().min(1, { message: "Due date is required." }),
  description: z.string().optional(),
  status: z.enum(["draft", "sent", "paid"]),
  currency: z.string().min(1, { message: "Currency is required." }),
  companyDetails: z.string().min(1, { message: "Company details are required." }),
  notes: z.string().optional(),
})

const currencies = [
  { value: 'ZAR', label: 'South African Rand (ZAR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
]

export default function NewInvoicePage() {
  const [items, setItems] = useState<Item[]>([])
  const [showMonthly, setShowMonthly] = useState(false)
  const [logo, setLogo] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const invoicePreviewRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const form = useForm<z.infer<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientCompany: "",
      invoiceNumber: "",
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0],
      description: "",
      status: "draft",
      currency: "ZAR",
      companyDetails: "",
      notes: "",
    },
  })

  const watchedFields = form.watch()

  const calculateTotal = (items: Item[]) => {
    return items.reduce((total, item) => {
      const itemTotal = item.quantity * item.unitPrice
      const taxAmount = (itemTotal * item.tax) / 100
      return total + itemTotal + taxAmount
    }, 0)
  }

  const handleItemsChange = (newItems: Item[]) => {
    setItems(newItems)
    // Update the total amount in the preview without creating the invoice
    const total = calculateTotal(newItems)
    console.log('Updated items, new total:', total)
  }

  const generateAndDownloadPDF = async (invoiceId: string) => {
    if (!invoicePreviewRef.current) {
      throw new Error('Invoice preview not found');
    }

    try {
      console.log('Starting PDF generation for invoice:', invoiceId);
      
      // Capture the invoice preview as an image
      const canvas = await html2canvas(invoicePreviewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Convert to PDF
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`invoice-${invoiceId}.pdf`);

      console.log('PDF generated successfully');
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
      });
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to generate PDF');
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

      // Check if client exists
      const { data: existingClients, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('email', values.clientEmail)
        .limit(1)
        .returns<{ id: string }[]>()

      if (clientError) {
        console.error('Error checking for existing client:', clientError)
        throw new Error(`Failed to check for existing client: ${clientError.message}`)
      }

      let clientId: string

      if (existingClients && existingClients.length > 0) {
        clientId = existingClients[0].id
        console.log('Using existing client:', clientId)
      } else {
        console.log('Creating new client...')
        // Create new client
        const { data: newClient, error: newClientError } = await supabase
          .from('clients')
          .insert({
            name: values.clientName,
            email: values.clientEmail,
            phone: values.clientPhone,
            company: values.clientCompany,
          })
          .select()
          .single<Client>()

        if (newClientError) {
          console.error('Error creating new client:', newClientError)
          throw new Error(`Failed to create new client: ${newClientError.message}`)
        }

        if (!newClient) {
          throw new Error('No client data returned after creation')
        }

        clientId = newClient.id
        console.log('New client created:', clientId)
      }

      // Get the current user's ID
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.error('Error getting user:', userError)
        throw new Error('Failed to get user information')
      }

      if (!user?.id) {
        throw new Error('No user ID found. Please log in again.')
      }

      // Create the invoice data
      const invoiceData = {
        client_id: clientId,
        client_name: values.clientName,
        client_email: values.clientEmail,
        client_company: values.clientCompany || null,
        number: values.invoiceNumber,
        description: values.description || '',
        status: values.status,
        currency: values.currency,
        amount: calculateTotal(items),
        created_at: values.issueDate,
        due_date: values.dueDate,
        company_details: values.companyDetails,
        notes: values.notes || '',
        logo,
        user_id: user.id
      }

      console.log('Attempting to save invoice with data:', {
        ...invoiceData,
        items_count: items.length
      })

      // Save the invoice
      const { data: savedInvoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert(invoiceData)
        .select()
        .single<DbInvoice>()

      if (invoiceError) {
        console.error('Error saving invoice:', {
          code: invoiceError.code,
          message: invoiceError.message,
          details: invoiceError.details,
          hint: invoiceError.hint
        })
        throw new Error(`Failed to save invoice: ${invoiceError.message}`)
      }

      if (!savedInvoice) {
        throw new Error('No invoice data returned after creation')
      }

      console.log('Invoice saved successfully:', savedInvoice.id)

      // Save invoice items
      if (items.length > 0) {
        console.log('Saving invoice items...')
        const { error: itemsError } = await supabase
          .from('invoice_items')
          .insert(
            items.map(item => ({
              invoice_id: savedInvoice.id,
              name: item.name,
              description: item.description || '',
              quantity: item.quantity,
              unit_price: item.unitPrice,
              tax: item.tax
            }))
          )

        if (itemsError) {
          console.error('Error saving invoice items:', {
            code: itemsError.code,
            message: itemsError.message,
            details: itemsError.details,
            hint: itemsError.hint
          })
          throw new Error(`Failed to save invoice items: ${itemsError.message}`)
        }

        console.log('Invoice items saved successfully')
      }

      // Generate and download PDF
      try {
        await generateAndDownloadPDF(savedInvoice.id as string)
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

      toast({
        title: "Success",
        description: "Invoice created successfully.",
      })

      router.push('/invoices')
    } catch (error) {
      console.error('Error in onSubmit:', error)
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

  const handlePrint = () => {
    const printContent = invoicePreviewRef.current
    const windowPrint = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0')
    
    if (printContent && windowPrint) {
      windowPrint.document.write(printContent.innerHTML)
      windowPrint.document.close()
      windowPrint.focus()
      windowPrint.print()
      windowPrint.close()
    }
  }

  // Move the invoice creation logic to only happen on form submission
  const handleSubmit = form.handleSubmit(async (values) => {
    if (items.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to the invoice",
        variant: "destructive",
      })
      return
    }
    await onSubmit(values)
  })

  const handleClientSelect = (client: Client | null) => {
    if (client) {
      form.setValue('clientName', client.name)
      form.setValue('clientEmail', client.email)
      form.setValue('clientPhone', client.phone || '')
      form.setValue('clientCompany', client.company || '')
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Create New Invoice</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="mb-6">
                  <Label>Select Existing Client</Label>
                  <ClientSelect onClientSelect={handleClientSelect} />
                </div>
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
                  name="clientEmail"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Enter client email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client phone" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientCompany"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Company</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter client company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="companyDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Details</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter your company details" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter invoice number" {...field} />
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
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter invoice description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select invoice status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select currency" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {currencies.map((currency) => (
                            <SelectItem key={currency.value} value={currency.value}>
                              {currency.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter any additional notes" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  <ItemInput items={items} onItemsChange={handleItemsChange} currency={watchedFields.currency} showMonthly={showMonthly} />
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-bold">Total:</span>
                  <span className="text-xl font-bold">
                    {watchedFields.currency} {calculateTotal(items).toFixed(2)}
                  </span>
                </div>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating Invoice..." : "Create Invoice"}
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
                logo={logo || undefined}
                description={watchedFields.description || ''}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

