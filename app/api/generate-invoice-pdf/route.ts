import { NextRequest, NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { getSupabase } from '@/lib/supabase-client'

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json()

    // Fetch invoice data from the database
    const supabase = getSupabase()
    const { data: invoice, error } = await supabase
      .from('invoices')
      .select('*, invoice_items(*)')
      .eq('id', invoiceId)
      .single()

    if (error) throw error
    if (!invoice) throw new Error('Invoice not found')

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 })
    let buffers: any[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Add content to the PDF
    addHeader(doc, invoice)
    addInvoiceDetails(doc, invoice)
    addItemsTable(doc, invoice.invoice_items)
    addTotals(doc, invoice)
    addFooter(doc)

    doc.end()

    return new Promise<NextResponse>((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers)
        resolve(new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="invoice-${invoice.number}.pdf"`,
          },
        }))
      })
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}

function addHeader(doc: PDFKit.PDFDocument, invoice: any) {
  if (invoice.logo) {
    doc.image(invoice.logo, 50, 45, { width: 100 })
  }
  doc.fontSize(25).text('Invoice', 50, 50)
}

function addInvoiceDetails(doc: PDFKit.PDFDocument, invoice: any) {
  doc.fontSize(12)
  doc.text(`Invoice Number: ${invoice.number}`, 50, 100)
  doc.text(`Issue Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 50, 115)
  doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 50, 130)
  doc.text(`Status: ${invoice.status}`, 50, 145)

  doc.text(`Client: ${invoice.client_name}`, 300, 100)
  doc.text(`Company: ${invoice.client_company || 'N/A'}`, 300, 115)
}

function addItemsTable(doc: PDFKit.PDFDocument, items: any[]) {
  const tableTop = 200
  doc.fontSize(10)

  doc.text('Item', 50, tableTop)
  doc.text('Description', 150, tableTop)
  doc.text('Quantity', 250, tableTop)
  doc.text('Unit Price', 300, tableTop)
  doc.text('Amount', 400, tableTop)

  let position = tableTop + 20

  items.forEach((item) => {
    doc.text(item.name, 50, position)
    doc.text(item.description, 150, position)
    doc.text(item.quantity.toString(), 250, position)
    doc.text(item.unit_price.toFixed(2), 300, position)
    const amount = item.quantity * item.unit_price
    doc.text(amount.toFixed(2), 400, position)
    position += 20
  })
}

function addTotals(doc: PDFKit.PDFDocument, invoice: any) {
  const totalsTop = 500
  doc.fontSize(12)
  doc.text(`Subtotal: ${invoice.currency} ${invoice.amount.toFixed(2)}`, 300, totalsTop)
  doc.text(`Total: ${invoice.currency} ${invoice.total.toFixed(2)}`, 300, totalsTop + 20)
}

function addFooter(doc: PDFKit.PDFDocument) {
  doc.fontSize(10).text('Thank you for your business!', 50, 700, { align: 'center' })
}

