'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CalendarDays, DollarSign, FileText, Users } from 'lucide-react'
import { RecentInvoices } from '@/components/dashboard/recent-invoices'
import { MetricCard } from '@/components/dashboard/metric-card'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { getSupabase } from '@/lib/supabase-client'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface RevenueData {
  date: string
  amount: number
}

interface ClientData {
  date: string
  count: number
}

interface Invoice {
  id: string
  client_name: string
  amount: number
  status: string
  created_at: string
}

interface Client {
  id: string
  name: string
  email: string
  total_invoices: number
  total_amount: number
}

interface DbClient {
  id: string;
  name: string;
  email: string;
}

interface DbInvoice {
  amount: number;
}

interface DbRevenueData {
  created_at: string;
  amount: number;
}

export default function DashboardPage() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [clientData, setClientData] = useState<ClientData[]>([])
  const [topInvoices, setTopInvoices] = useState<Invoice[]>([])
  const [topClients, setTopClients] = useState<Client[]>([])

  const fetchRevenueData = async () => {
    const { data, error } = await getSupabase()
      .from('invoices')
      .select('created_at, amount')
      .order('created_at', { ascending: true })
      .returns<DbRevenueData[]>()

    if (error) {
      console.error('Error fetching revenue data:', error)
      return []
    }
    
    return data.map(item => ({
      date: new Date(item.created_at).toLocaleDateString(),
      amount: item.amount
    }))
  }

  const fetchClientData = async () => {
    try {
      const { data, error } = await getSupabase()
        .from('clients')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (error) {
        if (error.code === '42P01') {
          console.error('Clients table does not exist yet. Please run the database migrations.')
          return []
        }
        throw error
      }

      const clientCounts: { [key: string]: number } = {}
      data.forEach(item => {
        const date = new Date(item.created_at as string).toLocaleDateString()
        clientCounts[date] = (clientCounts[date] || 0) + 1
      })
      return Object.entries(clientCounts).map(([date, count]) => ({
        date,
        count
      }))
    } catch (error) {
      console.error('Error fetching client data:', error)
      return []
    }
  }

  const fetchTopInvoices = async () => {
    const { data, error } = await getSupabase()
      .from('invoices')
      .select('id, client_name, amount, status, created_at')
      .order('amount', { ascending: false })
      .limit(5)
      .returns<Invoice[]>()

    if (error) {
      console.error('Error fetching top invoices:', error)
      return []
    }
    return data
  }

  const fetchTopClients = async () => {
    try {
      const { data: clients, error: clientsError } = await getSupabase()
        .from('clients')
        .select('id, name, email')
        .returns<DbClient[]>()

      if (clientsError) throw clientsError

      // Fetch invoices separately for each client
      const clientsWithTotals = await Promise.all(
        clients.map(async (client) => {
          const { data: invoices, error: invoicesError } = await getSupabase()
            .from('invoices')
            .select('amount')
            .eq('client_id', client.id as string)
            .returns<DbInvoice[]>()

          if (invoicesError) throw invoicesError

          const total_amount = invoices.reduce((sum, inv) => sum + inv.amount, 0)

          return {
            id: client.id,
            name: client.name,
            email: client.email,
            total_invoices: invoices.length,
            total_amount: total_amount
          }
        })
      )

      // Sort by total amount and get top 5
      return clientsWithTotals
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 5)

    } catch (error) {
      console.error('Error fetching top clients:', error)
      return []
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setRevenueData(await fetchRevenueData())
      setClientData(await fetchClientData())
      setTopInvoices(await fetchTopInvoices())
      setTopClients(await fetchTopClients())
    }

    fetchData()

    // Set up real-time listeners
    const revenueSubscription = getSupabase()
      .channel('revenue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchRevenueData().then(setRevenueData))
      .subscribe()

    const clientSubscription = getSupabase()
      .channel('client_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => fetchClientData().then(setClientData))
      .subscribe()

    const invoiceSubscription = getSupabase()
      .channel('invoice_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => fetchTopInvoices().then(setTopInvoices))
      .subscribe()

    return () => {
      getSupabase().removeChannel(revenueSubscription)
      getSupabase().removeChannel(clientSubscription)
      getSupabase().removeChannel(invoiceSubscription)
    }
  }, [])

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      </div>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard title="Total Revenue" icon={DollarSign} href="/analytics" />
            <MetricCard title="Active Clients" icon={Users} href="/clients" />
            <MetricCard title="Pending Invoices" icon={FileText} href="/invoices?status=pending" />
            <MetricCard title="Upcoming Due Dates" icon={CalendarDays} href="/calendar" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>Recent Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <RecentInvoices />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <QuickActions />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Over Time</CardTitle>
                <CardDescription>Daily revenue from invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: {
                      label: "Amount",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={revenueData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="amount" stroke="var(--color-amount)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>New Clients Over Time</CardTitle>
                <CardDescription>Daily new client acquisitions</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: {
                      label: "New Clients",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-[300px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={clientData}>
                      <XAxis dataKey="date" />
                      <YAxis />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Line type="monotone" dataKey="count" stroke="var(--color-count)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Invoices</CardTitle>
                <CardDescription>Highest value invoices</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell>{invoice.client_name}</TableCell>
                        <TableCell>{invoice.amount.toFixed(2)}</TableCell>
                        <TableCell>{invoice.status}</TableCell>
                        <TableCell>{new Date(invoice.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top 5 Clients</CardTitle>
                <CardDescription>Clients with highest total invoice amounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Total Invoices</TableHead>
                      <TableHead>Total Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topClients.map((client) => (
                      <TableRow key={client.id}>
                        <TableCell>{client.name}</TableCell>
                        <TableCell>{client.email}</TableCell>
                        <TableCell>{client.total_invoices}</TableCell>
                        <TableCell>{client.total_amount.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

