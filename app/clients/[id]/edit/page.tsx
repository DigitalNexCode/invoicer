'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabase } from '@/lib/supabase-client'
import { toast } from "@/components/ui/use-toast"
import Link from 'next/link'

const clientSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  phone: z.string().optional(),
  company: z.string().optional(),
})

type ClientFormData = z.infer<typeof clientSchema>

export default function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      company: "",
    },
  })

  useEffect(() => {
    const fetchClient = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', resolvedParams.id)
          .single<{
            name: string;
            email: string;
            phone: string | null;
            company: string | null;
          }>()

        if (error) {
          throw error
        }

        if (!data) {
          throw new Error('Client not found')
        }

        form.reset({
          name: data.name as string,
          email: data.email as string,
          phone: (data.phone as string | null) || '',
          company: (data.company as string | null) || '',
        })
      } catch (error) {
        console.error('Error fetching client:', error)
        toast({
          title: "Error",
          description: "Failed to load client details. Please try again.",
          variant: "destructive",
        })
        router.push('/clients')
      } finally {
        setLoading(false)
      }
    }

    fetchClient()
  }, [resolvedParams.id, router, form])

  const onSubmit = async (values: ClientFormData) => {
    try {
      const supabase = getSupabase()
      const { error } = await supabase
        .from('clients')
        .update({
          name: values.name,
          email: values.email,
          phone: values.phone || null,
          company: values.company || null,
        })
        .eq('id', resolvedParams.id)

      if (error) {
        throw error
      }

      toast({
        title: "Success",
        description: "Client updated successfully.",
      })

      router.push('/clients')
    } catch (error) {
      console.error('Error updating client:', error)
      toast({
        title: "Error",
        description: "Failed to update client. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl font-bold">Edit Client</CardTitle>
          <Link href="/clients">
            <Button variant="outline">Back to Clients</Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Enter client email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client phone" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter client company" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit">Save Changes</Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
} 