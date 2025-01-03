import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getSupabase } from '@/lib/supabase-client'

import { LayoutDashboard, FileText, ClipboardList, Users, Settings, UserPlus, BarChart, FileBarChart, LogOut } from 'lucide-react'

const sidebarNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Invoices',
    href: '/invoices',
    icon: FileText,
  },
  {
    title: 'Quotes',
    href: '/quotes',
    icon: ClipboardList,
  },
  {
    title: 'Clients',
    href: '/clients',
    icon: Users,
  },
  {
    title: 'Add Client',
    href: '/clients/new',
    icon: UserPlus,
  },
  {
    title: 'Analytics',
    href: '/analytics',
    icon: BarChart,
  },
  {
    title: 'Reports',
    href: '/reports',
    icon: FileBarChart,
  },
  {
    title: 'Settings',
    href: '/settings',
    icon: Settings,
  },
]

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Sidebar({ className }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    await getSupabase().auth.signOut()
    router.push('/login')
  }

  return (
    <div className={cn('pb-12 w-64', className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Menu
          </h2>
          <ScrollArea className="h-[calc(100vh-8rem)] px-1">
            <div className="space-y-1">
              {sidebarNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className="w-full justify-start"
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <div className="px-3 py-2">
        <Button
          variant="ghost"
          className="w-full justify-start text-red-500 hover:text-red-600 hover:bg-red-100"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}

