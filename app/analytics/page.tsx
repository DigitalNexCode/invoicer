'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createClient } from '@supabase/supabase-js'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface RevenueData {
  date: string
  amount: number
}

interface ClientData {
  date: string
  count: number
}

export default function AnalyticsPage() {
  const [revenueData, setRevenueData] = useState<RevenueData[]>([])
  const [clientData, setClientData] = useState<ClientData[]>([])

  useEffect(() => {
    const fetchRevenueData = async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('created_at, amount')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching revenue data:', error)
      } else {
        const formattedData = data.map(item => ({
          date: new Date(item.created_at).toLocaleDateString(),
          amount: item.amount
        }))
        setRevenueData(formattedData)
      }
    }

    const fetchClientData = async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('created_at')
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching client data:', error)
      } else {
        const clientCounts: { [key: string]: number } = {}
        data.forEach(item => {
          const date = new Date(item.created_at).toLocaleDateString()
          clientCounts[date] = (clientCounts[date] || 0) + 1
        })
        const formattedData = Object.entries(clientCounts).map(([date, count]) => ({
          date,
          count
        }))
        setClientData(formattedData)
      }
    }

    fetchRevenueData()
    fetchClientData()

    // Set up real-time listeners
    const revenueSubscription = supabase
      .channel('revenue_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, fetchRevenueData)
      .subscribe()

    const clientSubscription = supabase
      .channel('client_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetchClientData)
      .subscribe()

    return () => {
      supabase.removeChannel(revenueSubscription)
      supabase.removeChannel(clientSubscription)
    }
  }, [])

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Analytics</h1>
      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>
        <TabsContent value="revenue">
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
                className="h-[400px]"
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
        </TabsContent>
        <TabsContent value="clients">
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
                className="h-[400px]"
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

