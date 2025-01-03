import { useState, useEffect } from 'react'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { getSupabase } from '@/lib/supabase-client'

interface Client {
  id: string
  name: string
  email: string
  phone: string | null
  company: string | null
}

interface ClientSelectProps {
  onClientSelect: (client: Client | null) => void
}

export function ClientSelect({ onClientSelect }: ClientSelectProps) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const supabase = getSupabase()
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .order('name')
          .returns<Client[]>()

        if (error) throw error
        setClients(data || [])
      } catch (error) {
        console.error('Error fetching clients:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchClients()
  }, [])

  const handleSelect = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    setSelectedClient(client || null)
    onClientSelect(client || null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selectedClient ? selectedClient.name : "Select client..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search clients..." />
          <CommandEmpty>No client found.</CommandEmpty>
          <CommandGroup>
            {clients.map((client) => (
              <CommandItem
                key={client.id}
                value={client.id}
                onSelect={handleSelect}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selectedClient?.id === client.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span>{client.name}</span>
                  <span className="text-sm text-gray-500">{client.email}</span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 