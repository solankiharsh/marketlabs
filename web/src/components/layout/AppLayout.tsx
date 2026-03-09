import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard,
  Brain,
  LineChart,
  Bot,
  Briefcase,
  Workflow,
  Radar,
  Store,
  Settings,
  Users,
  User,
  CreditCard,
  LogOut,
  Menu,
  ChevronLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import { cn } from '@/lib/utils'

interface NavItem {
  path: string
  label: string
  icon: React.ReactNode
  permission?: string
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { path: '/ai-analysis', label: 'AI Analysis', icon: <Brain className="h-4 w-4" /> },
  { path: '/indicator-analysis', label: 'Indicator Analysis', icon: <LineChart className="h-4 w-4" /> },
  { path: '/indicator-community', label: 'Community', icon: <Store className="h-4 w-4" /> },
  { path: '/trading-assistant', label: 'Trading Assistant', icon: <Bot className="h-4 w-4" /> },
  { path: '/portfolio', label: 'Portfolio', icon: <Briefcase className="h-4 w-4" /> },
  { path: '/flow', label: 'Flow Editor', icon: <Workflow className="h-4 w-4" /> },
  { path: '/scanner', label: 'Scanner', icon: <Radar className="h-4 w-4" /> },
  { path: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, permission: 'admin' },
  { path: '/user-manage', label: 'Users', icon: <Users className="h-4 w-4" />, permission: 'admin' },
]

export default function AppLayout() {
  const { user, logout, hasPermission } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(
    (item) => !item.permission || hasPermission(item.permission)
  )

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          'flex flex-col border-r bg-card transition-all duration-200',
          collapsed ? 'w-16' : 'w-56'
        )}
      >
        <div className="flex h-14 items-center justify-between px-3 border-b">
          {!collapsed && (
            <Link to="/dashboard" className="text-lg font-bold text-primary">
              MarketLabs
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <ScrollArea className="flex-1 py-2">
          <nav className="flex flex-col gap-1 px-2">
            {filteredNav.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  location.pathname.startsWith(item.path)
                    ? 'bg-accent text-accent-foreground font-medium'
                    : 'text-muted-foreground'
                )}
                title={collapsed ? item.label : undefined}
              >
                {item.icon}
                {!collapsed && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <Separator />
        <div className="p-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  'w-full justify-start gap-3 px-3',
                  collapsed && 'justify-center px-0'
                )}
              >
                <img
                  src={user?.avatar || '/avatar2.jpg'}
                  alt="avatar"
                  className="h-6 w-6 rounded-full"
                />
                {!collapsed && (
                  <span className="truncate text-sm">
                    {user?.nickname || user?.username || 'User'}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => navigate('/profile')}>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/billing')}>
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </DropdownMenuItem>
              <Separator className="my-1" />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
