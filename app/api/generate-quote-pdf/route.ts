import { NextResponse } from 'next/server'
import PDFDocument from 'pdfkit'
import { Item } from '@/components/item-input'

export async function POST(request: Request) {
  try {
    const quoteData = await request.json()

    // Create a PDF document
    const doc = new PDFDocument({ margin: 50 })
    let buffers: any[] = []
    doc.on('data', buffers.push.bind(buffers))
    doc.on('end', () => {})

    // Add content to the PDF
    addHeader(doc, quoteData)
    addQuoteDetails(doc, quoteData)
    addItemsTable(doc, quoteData)
    addTotals(doc, quoteData)
    addNotes(doc, quoteData)
    addFooter(doc)

    doc.end()

    return new Promise((resolve) => {
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers)
        resolve(new NextResponse(pdfData, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="quote-${quoteData.quoteNumber}.pdf"`,
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

function addHeader(doc: PDFKit.PDFDocument, quoteData: any) {
  if (quoteData.logo) {
    doc.image(quoteData.logo, 50, 45, { width: 100 })
  }
  doc.fontSize(25).text('Quote', 50, 50)
}

function addQuoteDetails(doc: PDFKit.PDFDocument, quoteData: any) {
  doc.fontSize(12)
  doc.text(`Quote Number: ${quoteData.quoteNumber}`, 50, 100)
  doc.text(`Issue Date: ${quoteData.issueDate}`, 50, 115)
  doc.text(`Expiry Date: ${quoteData.expiryDate}`, 50, 130)
  doc.text(`Status: ${quoteData.status}`, 50, 145)

  doc.text(`Client: ${quoteData.clientName}`, 300, 100)
  doc.text(`Company: ${quoteData.companyDetails}`, 300, 115)
}

function addItemsTable(doc: PDFKit.PDFDocument, quoteData: any) {
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
  quoteData.items.forEach((item: Item) => {
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

function addTotals(doc: PDFKit.PDFDocument, quoteData: any) {
  const totalsTop = 500
  doc.fontSize(12)
  doc.text(`Subtotal: ${quoteData.currency} ${quoteData.subtotal.toFixed(2)}`, 300, totalsTop)
  doc.text(`Total (inc. tax): ${quoteData.currency} ${quoteData.total.toFixed(2)}`, 300, totalsTop + 20)
  if (quoteData.showMonthly) {
    const monthly = quoteData.total / 12
    doc.text(`Monthly: ${quoteData.currency} ${monthly.toFixed(2)}`, 300, totalsTop + 40)
  }
}

function addNotes(doc: PDFKit.PDFDocument, quoteData: any) {
  if (quoteData.notes) {
    doc.fontSize(10)
    doc.text('Notes:', 50, 600)
    doc.text(quoteData.notes, 50, 620)
  }
}

function addFooter(doc: PDFKit.PDFDocument) {
  doc.fontSize(10).text('Created by DigitalNexCode', 50, 700, { align: 'center' })
}
