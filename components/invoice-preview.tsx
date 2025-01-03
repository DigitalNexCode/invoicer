import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { InvoiceItem } from './new-invoice-page'
import { Button } from '@/components/ui/button'

interface InvoicePreviewProps {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientCompany?: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  description?: string;
  status: string;
  currency: string;
  companyDetails: string;
  notes?: string;
  items: InvoiceItem[];
  total: number;
  showMonthly: boolean;
  logo?: string;
}

export const InvoicePreview: React.FC<InvoicePreviewProps> = ({ 
  clientName,
  clientEmail,
  clientPhone,
  clientCompany,
  invoiceNumber,
  issueDate,
  dueDate,
  description,
  status,
  currency,
  companyDetails,
  notes,
  items,
  total,
  showMonthly,
  logo
}) => {
  const calculateSubtotal = (items: InvoiceItem[]) => {
    return items.reduce((subtotal, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      return subtotal + (quantity * unitPrice)
    }, 0)
  }

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      const tax = Number(item.tax) || 0
      const itemTotal = quantity * unitPrice
      const taxAmount = (itemTotal * tax) / 100
      return total + itemTotal + taxAmount
    }, 0)
  }

  const subtotal = calculateSubtotal(items)
  const monthly = total / 12

  return (
    <Card className="bg-white text-black">
      <CardHeader className="flex flex-row items-center justify-between">
        {logo && <img src={logo} alt="Company Logo" className="max-w-xs max-h-20 object-contain" />}
        <CardTitle className="text-2xl font-bold">Invoice</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <p className="font-bold">Invoice Number:</p>
            <p>{invoiceNumber || 'INV-0001'}</p>
          </div>
          <div>
            <p className="font-bold">Issue Date:</p>
            <p>{issueDate || 'YYYY-MM-DD'}</p>
          </div>
        </div>
        <div className="flex justify-between">
          <div>
            <p className="font-bold">Due Date:</p>
            <p>{dueDate || 'YYYY-MM-DD'}</p>
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
            {items.map((item) => {
              const quantity = Number(item.quantity) || 0
              const unitPrice = Number(item.unitPrice) || 0
              const tax = Number(item.tax) || 0
              const amount = quantity * unitPrice
              
              return (
                <TableRow key={item.id}>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{quantity.toString()}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{unitPrice.toFixed(2)}</TableCell>
                  <TableCell>{amount.toFixed(2)}</TableCell>
                  <TableCell>{tax.toFixed(2)}</TableCell>
                </TableRow>
              )
            })}
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
        <div className="mt-8 text-center text-sm text-gray-500">
          Created by DigitalNexCode
        </div>
      </CardContent>
    </Card>
  )
}

