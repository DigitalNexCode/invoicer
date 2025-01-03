import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Pencil, X } from 'lucide-react'

export interface Item {
  id?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  tax: number;
}

interface ItemInputProps {
  items: Item[]
  onItemsChange: (items: Item[]) => void
  currency: string
  showMonthly: boolean
}

export function ItemInput({ items, onItemsChange, currency, showMonthly }: ItemInputProps) {
  const [newItem, setNewItem] = useState<Item>({
    id: '',
    name: '',
    quantity: 0,
    description: '',
    unitPrice: 0,
    tax: 0,
  })
  const [editingItemId, setEditingItemId] = useState<string | undefined>(undefined)

  const addItem = () => {
    if (newItem.name && newItem.quantity > 0 && newItem.unitPrice > 0) {
      const updatedItems = [...items, { ...newItem, id: Date.now().toString() }]
      onItemsChange(updatedItems)
      setNewItem({
        id: '',
        name: '',
        quantity: 0,
        description: '',
        unitPrice: 0,
        tax: 0,
      })
    }
  }

  const removeItem = (id?: string) => {
    if (!id) return
    const updatedItems = items.filter(item => item.id !== id)
    onItemsChange(updatedItems)
  }

  const editItem = (id?: string) => {
    if (!id) return
    setEditingItemId(id)
    const itemToEdit = items.find(item => item.id === id)
    if (itemToEdit) {
      setNewItem({ ...itemToEdit })
    }
  }

  const updateItem = () => {
    if (!editingItemId) return;
    const updatedItems = items.map(item => 
      item.id === editingItemId ? { ...newItem, id: item.id } : item
    )
    onItemsChange(updatedItems)
    setEditingItemId(undefined)
    setNewItem({
      id: '',
      name: '',
      quantity: 0,
      description: '',
      unitPrice: 0,
      tax: 0,
    })
  }

  const cancelEdit = () => {
    setEditingItemId(undefined)
    setNewItem({
      id: '',
      name: '',
      quantity: 0,
      description: '',
      unitPrice: 0,
      tax: 0,
    })
  }

  const calculateSubtotal = (items: Item[]) => {
    return items.reduce((subtotal, item) => {
      const quantity = Number(item.quantity) || 0
      const unitPrice = Number(item.unitPrice) || 0
      return subtotal + (quantity * unitPrice)
    }, 0)
  }

  const calculateTotal = (items: Item[]) => {
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
  const total = calculateTotal(items)
  const monthly = total / 12

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Unit Price ({currency})</TableHead>
            <TableHead>Amount ({currency})</TableHead>
            <TableHead>Tax (%)</TableHead>
            <TableHead>Actions</TableHead>
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
                <TableCell>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => editItem(item.id)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeItem(item.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <div className="flex gap-2">
        <Input
          placeholder="Name"
          value={newItem.name}
          onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Qty"
          value={newItem.quantity || ''}
          onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
        />
        <Input
          placeholder="Description"
          value={newItem.description}
          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Unit Price"
          value={newItem.unitPrice || ''}
          onChange={(e) => setNewItem({ ...newItem, unitPrice: Number(e.target.value) })}
        />
        <Input
          type="number"
          placeholder="Tax %"
          value={newItem.tax || ''}
          onChange={(e) => setNewItem({ ...newItem, tax: Number(e.target.value) })}
        />
        {editingItemId ? (
          <>
            <Button onClick={updateItem}>Update Item</Button>
            <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
          </>
        ) : (
          <Button onClick={addItem}>Add Item</Button>
        )}
      </div>
      <div className="flex flex-col gap-2 text-right">
        <div className="flex justify-between items-center">
          <span className="font-bold">Subtotal:</span>
          <span>{currency} {calculateSubtotal(items).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-bold">Total (inc. tax):</span>
          <span>{currency} {calculateTotal(items).toFixed(2)}</span>
        </div>
        {showMonthly && (
          <div className="flex justify-between items-center">
            <span className="font-bold">Monthly:</span>
            <span>{currency} {(calculateTotal(items) / 12).toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

