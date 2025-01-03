'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabase } from '@/lib/supabase-client'
import { NewInvoicePage } from '@/components/new-invoice-page'
import { toast } from "@/components/ui/use-toast"

export default function InvoiceEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const [invoice, setInvoice] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        console.log('Debug: Starting invoice fetch for edit:', resolvedParams.id);

        if (!resolvedParams.id) {
          throw new Error('No invoice ID provided');
        }

        const { data, error } = await getSupabase()
          .from('invoices')
          .select(`
            *,
            invoice_items (*)
          `)
          .eq('id', resolvedParams.id)
          .single();

        if (error) {
          console.error('Supabase error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw new Error(`Failed to fetch invoice: ${error.message}`);
        }

        if (!data) {
          throw new Error('Invoice not found');
        }

        // Transform data to match form fields
        const transformedData = {
          clientName: data.client_name,
          clientEmail: data.client_email,
          clientPhone: data.client_phone || '',
          clientCompany: data.client_company || '',
          invoiceNumber: data.number,
          description: data.description || '',
          status: data.status,
          currency: data.currency,
          issueDate: (data.created_at as string).split('T')[0],
          dueDate: (data.due_date as string).split('T')[0],
          companyDetails: data.company_details,
          notes: data.notes || '',
          id: data.id,
          logo: data.logo,
          invoice_items: data.invoice_items
        };

        setInvoice(transformedData);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        toast({
          title: "Error",
          description: err instanceof Error ? err.message : "Failed to load invoice",
          variant: "destructive",
        });
        router.push('/invoices');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [resolvedParams.id, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Loading invoice...</div>
          <div className="text-sm text-gray-500">Please wait</div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-lg">Invoice not found</div>
          <div className="text-sm text-gray-500">The requested invoice could not be loaded</div>
        </div>
      </div>
    );
  }

  return <NewInvoicePage initialData={invoice} mode="edit" />;
} 