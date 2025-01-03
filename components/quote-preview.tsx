import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Item } from './item-input'
import { Mail, Save, Printer, Download } from 'lucide-react'
import { getSupabase } from '@/lib/supabase-client'
import { toast } from "@/components/ui/use-toast"
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

interface QuotePreviewProps {
  clientName: string
  clientEmail: string
  clientPhone?: string
  clientCompany?: string
  quoteNumber: string
  issueDate: string
  expiryDate: string
  description?: string
  status: string
  currency: string
  items: Item[]
  total: number
  showMonthly: boolean
  logo?: string | null
  companyDetails: string
  notes?: string
}

export function QuotePreview({
  clientName,
  clientEmail,
  clientPhone = '',
  clientCompany = '',
  quoteNumber,
  issueDate,
  expiryDate,
  description = '',
  status,
  currency,
  items,
  total,
  showMonthly,
  logo,
  companyDetails,
  notes,
}: QuotePreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null)

  const calculateSubtotal = (items: Item[]) => {
    return items.reduce((subtotal, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      return subtotal + (quantity * unitPrice);
    }, 0);
  };

  const subtotal = calculateSubtotal(items);
  const monthly = (Number(total) || 0) / 12;

  const handleEmailSend = async () => {
    toast({
      title: "Info",
      description: "Email sending feature not implemented yet.",
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    if (!previewRef.current) return

    try {
      const canvas = await html2canvas(previewRef.current, {
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
      pdf.save(`quote-${quoteNumber}.pdf`)

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

  return (
    <Card className="bg-white text-black">
      <CardHeader className="flex flex-row items-center justify-between">
        {logo && <img src={logo} alt="Company Logo" className="max-w-xs max-h-20 object-contain" />}
        <div className="flex items-center space-x-4">
          <CardTitle className="text-2xl font-bold">Quote</CardTitle>
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" /> Download PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4" ref={previewRef}>
        <div className="flex justify-between">
          <div>
            <p className="font-bold">Company Details:</p>
            <p className="whitespace-pre-wrap">{companyDetails || 'Your Company Details'}</p>
          </div>
          <div>
            <p className="font-bold">Client:</p>
            <p>{clientName || 'Client Name'}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <div>
            <p className="font-bold">Quote Number:</p>
            <p>{quoteNumber || 'QT-0001'}</p>
          </div>
          <div>
            <p className="font-bold">Issue Date:</p>
            <p>{issueDate || 'YYYY-MM-DD'}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <div>
            <p className="font-bold">Expiry Date:</p>
            <p>{expiryDate || 'YYYY-MM-DD'}</p>
          </div>
          <div>
            <p className="font-bold">Status:</p>
            <p>{status || 'Draft'}</p>
          </div>
        </div>
        <div>
          <p className="font-bold">Description:</p>
          <p>{description || 'No description provided'}</p>
        </div>
        <div>
          <p className="font-bold">Currency:</p>
          <p>{currency || 'ZAR'}</p>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Unit Price ({currency})</TableHead>
              <TableHead>Amount ({currency})</TableHead>
              <TableHead>Tax (%)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{item.quantity}</TableCell>
                <TableCell>{item.description}</TableCell>
                <TableCell>{(Number(item.unitPrice) || 0).toFixed(2)}</TableCell>
                <TableCell>{((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)).toFixed(2)}</TableCell>
                <TableCell>{item.tax || 0}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <div className="flex flex-col gap-2 text-right">
          <div>Subtotal: {currency} {subtotal.toFixed(2)}</div>
          <div>Total (inc. tax): {currency} {(Number(total) || 0).toFixed(2)}</div>
          {showMonthly && <div>Monthly: {currency} {monthly.toFixed(2)}</div>}
        </div>
        {notes && (
          <div className="mt-4">
            <p className="font-bold">Notes:</p>
            <p className="whitespace-pre-wrap">{notes}</p>
          </div>
        )}
        {/* <div className="flex justify-between mt-4">
          <Button onClick={handleEmailSend} className="flex items-center">
            <Mail className="mr-2 h-4 w-4" /> Send via Email
          </Button>
          <Button onClick={handlePrint} className="flex items-center">
            <Printer className="mr-2 h-4 w-4" /> Print
          </Button>
        </div> */}
        <div className="mt-8 text-center text-sm text-gray-500">
          Created by DigitalNexCode
        </div>
      </CardContent>
    </Card>
  )
}

