import { Construction } from 'lucide-react'

interface PlaceholderPageProps {
  title: string
  description?: string
}

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-6">
      <Construction className="h-12 w-12" />
      <h2 className="text-xl font-semibold text-foreground">{title}</h2>
      <p className="text-sm">{description || 'This page is being migrated to React. Coming soon.'}</p>
    </div>
  )
}
