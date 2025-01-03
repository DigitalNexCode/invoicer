export interface Metric {
  value: number
  change: number
}

export interface Invoice {
  id: string
  number: string
  client: string
  amount: number
  status: string
  date: Date
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  company: string
}

