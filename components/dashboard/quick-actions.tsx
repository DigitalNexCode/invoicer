import Link from "next/link"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  return (
    <div className="flex flex-col space-y-2">
      <Link href="/invoices/new">
        <Button className="w-full">Create New Invoice</Button>
      </Link>
      <Link href="/quotes/new">
        <Button variant="secondary" className="w-full">Create New Quote</Button>
      </Link>
      <Link href="/clients/new">
        <Button variant="outline" className="w-full">Add New Client</Button>
      </Link>
    </div>
  )
}

