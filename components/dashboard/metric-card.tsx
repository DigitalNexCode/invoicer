'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TypeIcon as type, LucideIcon } from 'lucide-react'
import Link from "next/link"
import { getSupabase } from '@/lib/supabase-client'

interface MetricCardProps {
  title: string
  icon: LucideIcon
  href: string
}

export function MetricCard({ title, icon: Icon, href }: MetricCardProps) {
  const [value, setValue] = useState<number | null>(null)
  const [change, setChange] = useState<number | null>(null)

  useEffect(() => {
    const fetchMetric = async () => {
      let metricValue = 0
      let metricChange = 0

      switch (title) {
        case 'Total Revenue':
          const { data: revenueData, error: revenueError } = await getSupabase().from('invoices').select('amount').eq('status', 'paid')
          
          if (revenueError) {
            console.error('Error fetching revenue:', revenueError)
          } else {
            metricValue = revenueData.reduce((sum, invoice) => sum + invoice.amount, 0)
          }
          break

        case 'Active Clients':
          const { count: clientCount, error: clientError } = await getSupabase().from('clients').select('*', { count: 'exact', head: true })
          
          if (clientError) {
            console.error('Error fetching client count:', clientError)
          } else {
            metricValue = clientCount || 0
          }
          break

        case 'Pending Invoices':
          const { count: pendingCount, error: pendingError } = await getSupabase().from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'pending')
          
          if (pendingError) {
            console.error('Error fetching pending invoices:', pendingError)
          } else {
            metricValue = pendingCount || 0
          }
          break

        case 'Upcoming Due Dates':
          const today = new Date()
          const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

          const { count: upcomingCount, error: upcomingError } = await getSupabase().from('invoices').select('*', { count: 'exact', head: true }).gte('due_date', today.toISOString()).lt('due_date', nextWeek.toISOString())
          
          if (upcomingError) {
            console.error('Error fetching upcoming due dates:', upcomingError)
          } else {
            metricValue = upcomingCount || 0
          }
          break
      }

      // Calculate change (this is a placeholder, you might want to implement actual change calculation)
      metricChange = Math.floor(Math.random() * 10) - 5 // Random number between -5 and 5

      setValue(metricValue)
      setChange(metricChange)
    }

    fetchMetric()

    // Set up real-time listener
    const channel = getSupabase()
      .channel('db_changes')
      .on('postgres_changes', { event: '*', schema: 'public' }, fetchMetric)
      .subscribe()

    return () => {
      getSupabase().removeChannel(channel)
    }
  }, [title])

  return (
    <Card>
      <Link href={href} className="block h-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            {title}
          </CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {value !== null ? (
            <>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground">
                {change !== null && (change > 0 ? '+' : '')}{change}% from last month
              </p>
            </>
          ) : (
            <Skeleton className="h-8 w-[100px]" />
          )}
        </CardContent>
      </Link>
    </Card>
  )
}

MetricCard.Skeleton = function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-[100px]" />
        <Skeleton className="h-4 w-[120px] mt-1" />
      </CardContent>
    </Card>
  )
}

