import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { Item } from '@/components/item-input'

export async function POST(request: Request) {
  try {
    const invoiceData = await request.json()

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 })
    let buffers: any[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Add content to the PDF
    addHeader(doc, invoiceData)
    addInvoiceDetails(doc, invoiceData)
    addItemsTable(doc, invoiceData)
    addTotals(doc, invoiceData)
    addNotes(doc, invoiceData)
    addFooter(doc)

    doc.end()

    return new Promise((resolve) => {
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

function addHeader(doc: PDFKit.PDFDocument, invoiceData: any) {
  if (invoiceData.logo) {
    doc.image(invoiceData.logo, 50, 45,invoiceData.logo, 50, 45, { width: 100 })
  }
  doc.fontSize(25).text('Invoice', 50, 50)
}

function addInvoiceDetails(doc: PDFKit.PDFDocument, invoiceData: any) {
  doc.fontSize(12)
  doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 50, 100)
  doc.text(`Issue Date: ${invoiceData.issueDate}`, 50, 115)
  doc.text(`Due Date: ${invoiceData.dueDate}`, 50, 130)
  doc.text(`Status: ${invoiceData.status}`, 50, 145)

  doc.text(`Client: ${invoiceData.clientName}`, 300, 100)
  doc.text(`Company: ${invoiceData.companyDetails}`, 300, 115)
}

function addItemsTable(doc: PDFKit.PDFDocument, invoiceData: any) {
  const tableTop = 200
  doc.fontSize(10)

  // Add table headers
  doc.text('Item', 50, tableTop)
  doc.text('Description', 150, tableTop)
  doc.text('Quantity', 250, tableTop)
  doc.text('Unit Price', 300, tableTop)
  doc.text('Tax', 350, tableTop)
  doc.text('Amount', 400, tableTop)

  let position = tableTop + 20

  // Add table rows
  invoiceData.items.forEach((item: Item) => {
    doc.text(item.name, 50, position)
    doc.text(item.description, 150, position)
    doc.text(item.quantity.toString(), 250, position)
    doc.text(item.unitPrice.toFixed(2), 300, position)
    doc.text(`${item.tax}%`, 350, position)
    const amount = item.quantity * item.unitPrice * (1 + item.tax / 100)
    doc.text(amount.toFixed(2), 400, position)
    position += 20
  })
}

function addTotals(doc: PDFKit.PDFDocument, invoiceData: any) {
  const totalsTop = 500
  doc.fontSize(12)
  doc.text(`Subtotal: ${invoiceData.currency} ${invoiceData.subtotal.toFixed(2)}`, 300, totalsTop)
  doc.text(`Total (inc. tax): ${invoiceData.currency} ${invoiceData.total.toFixed(2)}`, 300, totalsTop + 20)
  if (invoiceData.showMonthly) {
    const monthly = invoiceData.total / 12
    doc.text(`Monthly: ${invoiceData.currency} ${monthly.toFixed(2)}`, 300, totalsTop + 40)
  }
}

function addNotes(doc: PDFKit.PDFDocument, invoiceData: any) {
  if (invoiceData.notes) {
    doc.fontSize(10)
    doc.text('Notes:', 50, 600)
    doc.text(invoiceData.notes, 50, 620)
  }
}

function addFooter(doc: PDFKit.PDFDocument) {
  doc.fontSize(10).text('Created by DigitalNexCode', 50, 700, { align: 'center' })
}

