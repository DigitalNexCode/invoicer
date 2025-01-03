import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getSupabase } from '@/lib/supabase-client'
import { Item } from '@/components/item-input'

export async function POST(request: Request): Promise<Response> {
  try {
    const invoiceData = await request.json()

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 })
    let buffers: any[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Add content to the PDF
    if (invoiceData.logo) {
      doc.image(invoiceData.logo, 50, 45, { width: 100 })
    }
    doc.fontSize(25).text('Invoice', 50, 50)

    // Add invoice details
    doc.fontSize(12)
    doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, 100)
    doc.text(`Issue Date: ${invoiceData.issueDate}`, 50, 115)
    doc.text(`Due Date: ${invoiceData.dueDate}`, 50, 130)
    doc.text(`Status: ${invoiceData.status}`, 50, 145)

    doc.text(`Client: ${invoiceData.clientName}`, 300, 100)
    doc.text(`Email: ${invoiceData.clientEmail}`, 300, 115)
    if (invoiceData.clientPhone) {
      doc.text(`Phone: ${invoiceData.clientPhone}`, 300, 130)
    }
    if (invoiceData.clientCompany) {
      doc.text(`Company: ${invoiceData.clientCompany}`, 300, 145)
    }

    // Add items table
    const tableTop = 200
    doc.fontSize(10)

    // Table headers
    doc.text('Item', 50, tableTop)
    doc.text('Description', 150, tableTop)
    doc.text('Quantity', 250, tableTop)
    doc.text('Unit Price', 300, tableTop)
    doc.text('Tax', 350, tableTop)
    doc.text('Amount', 400, tableTop)

    let position = tableTop + 20

    // Table rows
    invoiceData.items.forEach((item: Item) => {
      doc.text(item.name, 50, position)
      doc.text(item.description || '', 150, position)
      doc.text(item.quantity.toString(), 250, position)
      doc.text(item.unitPrice.toFixed(2), 300, position)
      doc.text(`${item.tax}%`, 350, position)
      const amount = item.quantity * item.unitPrice * (1 + item.tax / 100)
      doc.text(amount.toFixed(2), 400, position)
      position += 20
    })

    // Add totals
    const totalsTop = position + 20
    doc.fontSize(12)
    doc.text(`Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}`, 300, totalsTop)
    doc.text(`Total (inc. tax): ${invoiceData.currency} ${invoiceData.total.toFixed(2)}`, 300, totalsTop + 20)
    if (invoiceData.showMonthly) {
      const monthly = invoiceData.total / 12
      doc.text(`Monthly: ${invoiceData.currency} ${monthly.toFixed(2)}`, 300, totalsTop + 40)
    }

    // Add notes if any
    if (invoiceData.notes) {
      doc.fontSize(10)
      doc.text('Notes:', 50, totalsTop + 60)
      doc.text(invoiceData.notes, 50, totalsTop + 80)
    }

    // Add footer
    doc.fontSize(10).text('Created by DigitalNexCode', 50, 700, { align: 'center' })

    doc.end()

    return new Promise<Response>((resolve) => {
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        resolve(new NextResponse(pdfData, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${invoiceData.invoiceNumber}.pdf"`,
          },
        }))
      })
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return new NextResponse(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }
}

