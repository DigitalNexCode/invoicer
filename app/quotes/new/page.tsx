'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
import { QuotePreview } from '@/components/quote-preview'
import { ItemInput, Item } from '@/components/item-input'
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { LogoUpload } from '@/components/logo-upload'
import { toast } from "@/components/ui/use-toast"
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import type { ControllerRenderProps } from 'react-hook-form'
import { FormattedQuoteData } from '../[id]/edit/page'

const supabaseUrl: string = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey: string = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

const quoteSchema = z.object({
  clientName: z.string().min(1, { message: "Client name is required." }),
  clientEmail: z.string().email({ message: "Please enter a valid email address." }),
  clientPhone: z.string().optional(),
  clientCompany: z.string().optional(),
  quoteNumber: z.string().min(1, { message: "Quote number is required." }),
  issueDate: z.string().min(1, { message: "Issue date is required." }),
  expiryDate: z.string().min(1, { message: "Expiry date is required." }),
  description: z.string().optional(),
  status: z.enum(["draft", "sent", "accepted", "rejected"]),
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

interface FormField {
  onChange: (...event: any[]) => void;
  value: string;
}

interface SupabaseQuote {
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
  expiry_date: string;
  company_details: string;
  notes?: string;
  logo?: string;
}

interface FormFieldProps {
  field: ControllerRenderProps<z.infer<typeof quoteSchema>>;
}

interface QuoteData {
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  client_company?: string | null;
  number: string;
  description: string;
  status: string;
  currency: string;
  amount: number;
  created_at: string;
  expiry_date: string;
  company_details: string;
  notes?: string;
  logo?: string | null;
}

async function testSupabaseConnection() {
  const { data, error } = await supabase.from('quotes').select('id').limit(1);
  if (error) {
    console.error('Supabase connection test failed:', error);
  } else {
    console.log('Supabase connection test succeeded:', data);
  }
}

testSupabaseConnection();

interface NewQuotePageProps {
  initialData?: FormattedQuoteData | null
  isEditing?: boolean
  quoteId?: string
}

export default function NewQuotePage({ initialData, isEditing = false, quoteId }: NewQuotePageProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [items, setItems] = useState<Item[]>(initialData?.items || [])
  const [showMonthly, setShowMonthly] = useState(false)
  const [logo, setLogo] = useState<string | null>(initialData?.logo || null)
  const [defaultCurrency, setDefaultCurrency] = useState('ZAR')
  const quotePreviewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('default_currency')
        .single()

      if (!error && data?.default_currency) {
        setDefaultCurrency(data.default_currency)
      }
    }

    fetchSettings()
  }, [])

  const form = useForm<z.infer<typeof quoteSchema>>({
    resolver: zodResolver(quoteSchema),
    defaultValues: initialData || {
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      clientCompany: "",
      quoteNumber: "",
      issueDate: "",
      expiryDate: "",
      description: "",
      status: "draft",
      currency: defaultCurrency,
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
  }

  async function saveQuoteItems(items: Item[], quoteId: string) {
    const formattedItems = items.map((item) => ({
      quote_id: quoteId,
      item_description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      total_price: item.quantity * item.unitPrice,
    }));

    const { data, error } = await supabase.from('quote_items').insert(formattedItems);

    if (error) {
      console.error('Error saving quote items:', error);
      throw new Error('Failed to save quote items');
    }

    return data;
  }

  const generatePDF = async () => {
    if (!quotePreviewRef.current) {
      throw new Error('Quote preview element not found')
    }

    try {
      // Wait for any pending renders/state updates
      await new Promise(resolve => setTimeout(resolve, 100))

      const element = quotePreviewRef.current
      const canvas = await html2canvas(element, {
        logging: true,
        useCORS: true,
        scale: 2,
        onclone: (clonedDoc) => {
          // Ensure styles are properly applied in the cloned document
          const clonedElement = clonedDoc.querySelector('[data-pdf-content]') as HTMLElement
          if (clonedElement) {
            clonedElement.style.width = '210mm' // A4 width
            clonedElement.style.margin = '0'
            clonedElement.style.padding = '20px'
          }
        }
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
      return pdf
    } catch (error) {
      console.error('PDF generation error details:', {
        error,
        elementExists: !!quotePreviewRef.current,
        elementContent: quotePreviewRef.current?.innerHTML
      })
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error during PDF generation'}`)
    }
  }

  function isSupabaseQuote(data: any): data is SupabaseQuote {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.id === 'string' &&
      typeof data.client_name === 'string' &&
      typeof data.client_email === 'string' &&
      typeof data.number === 'string'
    )
  }

  async function saveQuoteToSupabase(quote: QuoteData): Promise<SupabaseQuote> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .insert([{
          client_id: quote.client_id,
          client_name: quote.client_name,
          client_email: quote.client_email,
          client_phone: quote.client_phone || null,
          client_company: quote.client_company || null,
          number: quote.number,
          description: quote.description || '',
          status: quote.status,
          currency: quote.currency,
          amount: quote.amount,
          created_at: quote.created_at,
          expiry_date: quote.expiry_date,
          company_details: quote.company_details,
          notes: quote.notes || null,
          logo: quote.logo || null,
        }])
        .select('*')
        .single()

      if (error) {
        console.error('Supabase save error details:', error)
        throw new Error(`Database error: ${error.message || 'Unknown error during save'}`)
      }

      if (!data) {
        throw new Error('No data returned from database')
      }

      console.log('Quote saved successfully:', data)
      return data
    } catch (error) {
      console.error('Detailed save error:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      })
      throw error
    }
  }
  

  async function checkQuoteNumber(number: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('quotes')
      .select('number')
      .eq('number', number)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
      console.error('Error checking quote number:', error);
      throw new Error(`Failed to check quote number: ${error.message}`);
    }

    return !!data;
  }

  async function generateUniqueQuoteNumber(baseNumber: string): Promise<string> {
    let counter = 1;
    let newNumber = baseNumber;

    while (await checkQuoteNumber(newNumber)) {
      newNumber = `${baseNumber}-${counter}`;
      counter++;
    }

    return newNumber;
  }

  async function onSubmit(values: z.infer<typeof quoteSchema>) {
    try {
      console.log('Starting quote submission with values:', values)

      // If editing, update instead of create
      if (isEditing && quoteId) {
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            client_name: values.clientName,
            client_email: values.clientEmail,
            client_phone: values.clientPhone || null,
            client_company: values.clientCompany || null,
            number: values.quoteNumber,
            description: values.description || '',
            status: values.status,
            currency: values.currency,
            amount: calculateTotal(items),
            created_at: values.issueDate,
            expiry_date: values.expiryDate,
            company_details: values.companyDetails,
            notes: values.notes || '',
            logo: logo,
          })
          .eq('id', quoteId)

        if (updateError) {
          throw new Error(`Failed to update quote: ${updateError.message}`)
        }

        // Update quote items
        if (items.length > 0) {
          // Delete existing items
          await supabase
            .from('quote_items')
            .delete()
            .eq('quote_id', quoteId)

          // Insert new items
          await saveQuoteItems(items, quoteId)
        }

        toast({
          title: "Success",
          description: "Quote updated successfully.",
        })

        return
      }

      // Validate form data first
      if (!values.clientName || !values.clientEmail || !values.quoteNumber) {
        const missingFields = [];
        if (!values.clientName) missingFields.push('Client Name');
        if (!values.clientEmail) missingFields.push('Client Email');
        if (!values.quoteNumber) missingFields.push('Quote Number');
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      // Check for duplicate quote number
      try {
        const isDuplicate = await checkQuoteNumber(values.quoteNumber);
        if (isDuplicate) {
          const uniqueNumber = await generateUniqueQuoteNumber(values.quoteNumber);
          console.log(`Quote number ${values.quoteNumber} already exists, using ${uniqueNumber} instead`);
          values.quoteNumber = uniqueNumber;
        }
      } catch (error) {
        console.error('Error checking quote number:', error);
        throw new Error('Failed to verify quote number uniqueness');
      }

      // Test database connection
      try {
        const { error: connectionError } = await supabase.from('quotes').select('count').limit(0)
        if (connectionError) {
          console.error('Database connection test failed:', connectionError)
          throw new Error(`Database connection failed: ${connectionError.message}`)
        }
      } catch (connError) {
        console.error('Connection test error:', connError)
        throw new Error('Failed to connect to database. Please check your internet connection.')
      }

      // Check if client exists
      try {
        const { data: existingClients, error: clientError } = await supabase
          .from('clients')
          .select('id')
          .eq('email', values.clientEmail)
          .limit(1)

        if (clientError) {
          console.error('Client lookup error:', clientError)
          throw new Error(`Failed to check client: ${clientError.message}`)
        }

        let clientId: string

        if (existingClients && existingClients.length > 0) {
          const id = existingClients[0].id
          if (typeof id !== 'string') {
            throw new Error('Invalid client ID returned')
          }
          clientId = id
          console.log('Using existing client:', clientId)
        } else {
          console.log('Creating new client...')
          const { data: newClient, error: newClientError } = await supabase
            .from('clients')
            .insert({
              name: values.clientName,
              email: values.clientEmail,
              phone: values.clientPhone,
              company: values.clientCompany,
            })
            .select()
            .single()

          if (newClientError) {
            console.error('Client creation error:', newClientError)
            throw new Error(`Failed to create client: ${newClientError.message}`)
          }

          if (!newClient?.id) {
            throw new Error('Failed to create client: No ID returned')
          }

          clientId = newClient.id
          console.log('New client created:', clientId)
        }

        // Create the quote data
        const quoteData: QuoteData = {
          client_id: clientId,
          client_name: values.clientName,
          client_email: values.clientEmail,
          client_phone: values.clientPhone,
          client_company: values.clientCompany || null,
          number: values.quoteNumber,
          description: values.description || '',
          status: values.status,
          currency: values.currency,
          amount: calculateTotal(items),
          created_at: values.issueDate,
          expiry_date: values.expiryDate,
          company_details: values.companyDetails,
          notes: values.notes || '',
          logo: logo,
        }

        console.log('Attempting to save quote with data:', quoteData)

        // Save the quote
        const savedQuote = await saveQuoteToSupabase(quoteData)
        console.log('Quote saved successfully:', savedQuote)

        // Save quote items
        if (items.length > 0) {
          try {
            await saveQuoteItems(items, savedQuote.id)
            console.log('Quote items saved successfully')
          } catch (itemError) {
            console.error('Quote items save error:', itemError)
            throw new Error(`Failed to save quote items: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`)
          }
        }

        // Generate PDF
        try {
          if (!quotePreviewRef.current) {
            throw new Error('Quote preview element not found for PDF generation')
          }

          // Add data-attribute for PDF generation
          quotePreviewRef.current.setAttribute('data-pdf-content', 'true')

          const pdf = await generatePDF()
          if (!pdf) {
            throw new Error('PDF generation failed: No PDF object returned')
          }

          try {
            const pdfBlob = pdf.output('blob')
            if (!pdfBlob) {
              throw new Error('Failed to create PDF blob')
            }

            const pdfUrl = URL.createObjectURL(pdfBlob)
            setPdfUrl(pdfUrl)
            console.log('PDF generated and blob URL created successfully')

            toast({
              title: "Success",
              description: "Quote created and PDF generated successfully.",
            })
          } catch (blobError) {
            console.error('PDF blob creation failed:', blobError)
            throw new Error(`Failed to create downloadable PDF: ${blobError instanceof Error ? blobError.message : 'Unknown blob error'}`)
          }
        } catch (pdfError) {
          console.error('PDF generation failed:', {
            error: pdfError,
            message: pdfError instanceof Error ? pdfError.message : 'Unknown error',
            stack: pdfError instanceof Error ? pdfError.stack : undefined
          })
          throw new Error(`Failed to generate PDF: ${pdfError instanceof Error ? pdfError.message : 'Unknown PDF error'}`)
        }

      } catch (dbError) {
        console.error('Database operation failed:', dbError)
        throw new Error(`Database operation failed: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`)
      }

    } catch (error) {
      const errorDetails = {
        name: error instanceof Error ? error.name : 'Unknown Error',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
        formValues: values,
      }
      
      console.error('Quote submission failed:', errorDetails)
      
      toast({
        title: "Error",
        description: error instanceof Error 
          ? `Failed to save quote: ${error.message}`
          : "An unexpected error occurred while saving the quote",
        variant: "destructive",
      })

      // Re-throw the error to prevent further execution
      throw error
    }
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Create New Quote</h1>
      <div className="flex flex-col lg:flex-row gap-6">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Quote Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="clientName"
                  render={({ field }: FormFieldProps) => (
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
                  render={({ field }: FormFieldProps) => (
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
                  render={({ field }: FormFieldProps) => (
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
                  render={({ field }: FormFieldProps) => (
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
                  render={({ field }: FormFieldProps) => (
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
                  name="quoteNumber"
                  render={({ field }: FormFieldProps) => (
                    <FormItem>
                      <FormLabel>Quote Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter quote number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }: FormFieldProps) => (
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
                  name="expiryDate"
                  render={({ field }: FormFieldProps) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
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
                  render={({ field }: FormFieldProps) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Enter quote description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }: FormFieldProps) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select quote status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="sent">Sent</SelectItem>
                          <SelectItem value="accepted">Accepted</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }: FormFieldProps) => (
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
                  render={({ field }: FormFieldProps) => (
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
                <Button type="submit">
                  {isEditing ? "Save Quote" : "Create Quote"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Quote Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div ref={quotePreviewRef}>
              <QuotePreview 
                {...watchedFields} 
                items={items} 
                total={calculateTotal(items)} 
                showMonthly={showMonthly} 
                logo={logo}
                description={watchedFields.description || ''}
              />
            </div>
          </CardContent>
        </Card>
      </div>
      {pdfUrl && (
        <Card className="mt-6">
          <CardContent className="flex items-center justify-between">
            <p>Your quote has been created successfully!</p>
            <div>
              <a href={pdfUrl} download="quote.pdf">
                <Button>Download PDF</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

