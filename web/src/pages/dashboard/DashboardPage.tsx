import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LayoutDashboard, Brain, LineChart, Briefcase, Workflow, Radar } from 'lucide-react'
import { Link } from 'react-router-dom'

const quickLinks = [
  { path: '/ai-analysis', label: 'AI Analysis', icon: Brain, description: 'AI-powered market analysis' },
  { path: '/indicator-analysis', label: 'Indicator Analysis', icon: LineChart, description: 'Technical indicator charts' },
  { path: '/portfolio', label: 'Portfolio', icon: Briefcase, description: 'Manage your positions' },
  { path: '/flow', label: 'Flow Editor', icon: Workflow, description: 'Visual strategy builder' },
  { path: '/scanner', label: 'Scanner', icon: Radar, description: 'Market scanner webhooks' },
]

export default function DashboardPage() {
  const { user } = useAuth()

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.nickname || user?.username || 'User'}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => (
          <Link key={link.path} to={link.path}>
            <Card className="transition-colors hover:bg-accent cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <link.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{link.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{link.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
