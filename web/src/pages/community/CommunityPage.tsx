import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Store, Search, Star, ShoppingCart, MessageCircle, Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import * as communityApi from '@/api/community'
import { cn } from '@/lib/utils'

interface CommunityIndicator {
  id: number
  name: string
  description: string
  author: string
  author_avatar?: string
  pricing_type: 'free' | 'paid'
  price?: number
  currency?: string
  rating: number
  rating_count: number
  download_count: number
  status: string
  created_at: string
}

interface Comment {
  id: number
  username: string
  content: string
  rating?: number
  created_at: string
}

export default function CommunityPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [pricingType, setPricingType] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [selectedIndicator, setSelectedIndicator] = useState<CommunityIndicator | null>(null)
  const [comment, setComment] = useState('')
  const [commentRating, setCommentRating] = useState(5)

  const { data: indicatorsData, isLoading } = useQuery({
    queryKey: ['community-indicators', page, keyword, pricingType, sortBy],
    queryFn: async () => {
      const res = await communityApi.getIndicators({ page, pagesize: 20, keyword, pricingType, sortBy })
      return res.data?.data || { items: [], total: 0 }
    },
  })

  const indicators = (indicatorsData as { items: CommunityIndicator[]; total: number })?.items || []
  const total = (indicatorsData as { items: CommunityIndicator[]; total: number })?.total || 0

  const { data: comments = [] } = useQuery({
    queryKey: ['indicator-comments', selectedIndicator?.id],
    queryFn: async () => {
      if (!selectedIndicator) return []
      const res = await communityApi.getComments(selectedIndicator.id)
      return (res.data?.data || []) as Comment[]
    },
    enabled: !!selectedIndicator,
  })

  const purchaseMutation = useMutation({
    mutationFn: (id: number) => communityApi.purchaseIndicator(id),
    onSuccess: () => { toast.success('Indicator purchased!'); queryClient.invalidateQueries({ queryKey: ['community-indicators'] }) },
    onError: () => toast.error('Purchase failed'),
  })

  const commentMutation = useMutation({
    mutationFn: () => communityApi.addComment(selectedIndicator!.id, { content: comment, rating: commentRating }),
    onSuccess: () => {
      toast.success('Comment added')
      setComment('')
      queryClient.invalidateQueries({ queryKey: ['indicator-comments', selectedIndicator?.id] })
    },
    onError: () => toast.error('Failed to add comment'),
  })

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-bold flex items-center gap-2"><Store className="h-5 w-5" /> Community Indicators</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8 w-56"
              placeholder="Search indicators..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && setPage(1)}
            />
          </div>
          <div className="flex gap-0.5">
            <Button variant={pricingType === '' ? 'default' : 'ghost'} size="sm" onClick={() => { setPricingType(''); setPage(1) }}>All</Button>
            <Button variant={pricingType === 'free' ? 'default' : 'ghost'} size="sm" onClick={() => { setPricingType('free'); setPage(1) }}>Free</Button>
            <Button variant={pricingType === 'paid' ? 'default' : 'ghost'} size="sm" onClick={() => { setPricingType('paid'); setPage(1) }}>Paid</Button>
          </div>
          <Select value={sortBy} onValueChange={v => { setSortBy(v); setPage(1) }}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="hot">Popular</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
              <SelectItem value="price_asc">Price Low→High</SelectItem>
              <SelectItem value="price_desc">Price High→Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : indicators.length === 0 ? (
        <Card><CardContent className="text-center py-12 text-muted-foreground">No indicators found</CardContent></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {indicators.map(ind => (
              <Card key={ind.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedIndicator(ind)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold truncate flex-1">{ind.name}</h3>
                    <Badge variant={ind.pricing_type === 'free' ? 'secondary' : 'default'}>
                      {ind.pricing_type === 'free' ? 'Free' : `$${ind.price}`}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{ind.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{ind.author}</span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5"><Star className="h-3 w-3 text-yellow-500" /> {ind.rating.toFixed(1)}</span>
                      <span>{ind.download_count} uses</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {total > 20 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <span className="text-sm text-muted-foreground py-2">Page {page} of {Math.ceil(total / 20)}</span>
              <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          )}
        </>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedIndicator} onOpenChange={() => setSelectedIndicator(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {selectedIndicator?.name}
              {selectedIndicator?.pricing_type === 'free' ? (
                <Badge variant="secondary">Free</Badge>
              ) : (
                <Badge>${selectedIndicator?.price}</Badge>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedIndicator && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <p className="text-muted-foreground">{selectedIndicator.description}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>By: <strong>{selectedIndicator.author}</strong></span>
                  <span className="flex items-center gap-1"><Star className="h-4 w-4 text-yellow-500" /> {selectedIndicator.rating.toFixed(1)} ({selectedIndicator.rating_count})</span>
                  <span>{selectedIndicator.download_count} uses</span>
                </div>

                {selectedIndicator.pricing_type === 'paid' && (
                  <Button onClick={() => purchaseMutation.mutate(selectedIndicator.id)} disabled={purchaseMutation.isPending}>
                    <ShoppingCart className="h-4 w-4 mr-1" /> Purchase for ${selectedIndicator.price}
                  </Button>
                )}

                {/* Comments */}
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> Comments</h4>
                  <div className="space-y-3 mb-4">
                    {comments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No comments yet</p>
                    ) : comments.map(c => (
                      <div key={c.id} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm">{c.username}</span>
                          <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p className="text-sm">{c.content}</p>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment..." />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(n => (
                          <button key={n} onClick={() => setCommentRating(n)}>
                            <Star className={cn('h-4 w-4', n <= commentRating ? 'text-yellow-500 fill-yellow-500' : 'text-muted-foreground')} />
                          </button>
                        ))}
                      </div>
                      <Button size="sm" onClick={() => commentMutation.mutate()} disabled={!comment || commentMutation.isPending}>
                        Post Comment
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
