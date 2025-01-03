import { Invoice, Metric, Client } from './types'

export async function fetchMetric(metricName: string): Promise<Metric> {
  // In a real application, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
  const randomValue = Math.floor(Math.random() * 10000)
  const randomChange = Math.floor(Math.random() * 20) - 10
  return { value: randomValue, change: randomChange }
}

export async function fetchRecentInvoices(): Promise<Invoice[]> {
  // In a real application, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
  return [
    { id: '1', number: 'INV-001', client: 'Acme Corp', amount: 1000, status: 'Paid', date: new Date() },
    { id: '2', number: 'INV-002', client: 'Globex', amount: 2000, status: 'Pending', date: new Date() },
    { id: '3', number: 'INV-003', client: 'Initech', amount: 3000, status: 'Overdue', date: new Date() },
    { id: '4', number: 'INV-004', client: 'Umbrella Corp', amount: 4000, status: 'Paid', date: new Date() },
    { id: '5', number: 'INV-005', client: 'Hooli', amount: 5000, status: 'Pending', date: new Date() },
  ]
}

export async function fetchClients(): Promise<Client[]> {
  // In a real application, this would be an API call
  await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate API delay
  return [
    { id: '1', name: 'John Doe', email: 'john@example.com', phone: '123-456-7890', company: 'Acme Corp' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', phone: '098-765-4321', company: 'Globex' },
    { id: '3', name: 'Bob Johnson', email: 'bob@example.com', phone: '555-555-5555', company: 'Initech' },
    { id: '4', name: 'Alice Brown', email: 'alice@example.com', phone: '111-222-3333', company: 'Umbrella Corp' },
    { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', phone: '444-444-4444', company: 'Hooli' },
  ]
}

