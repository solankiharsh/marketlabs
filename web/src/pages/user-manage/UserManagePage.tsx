import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Users, Plus, Edit, Trash2, Crown, Wallet, Key, Search, Loader2, RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import * as userApi from '@/api/user'
import { cn } from '@/lib/utils'

interface UserRecord {
  id: number
  username: string
  email?: string
  nickname?: string
  role: string
  status: string
  credits: number
  vip_expires_at?: string
  last_login_at?: string
  created_at: string
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-500',
  vip: 'bg-yellow-500',
  user: 'bg-blue-500',
}

export default function UserManagePage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreditsModal, setShowCreditsModal] = useState(false)
  const [showVipModal, setShowVipModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null)
  const [createForm, setCreateForm] = useState({ username: '', password: '', email: '', nickname: '', role: 'user' })
  const [editForm, setEditForm] = useState({ email: '', nickname: '', role: '', status: '' })
  const [creditsAmount, setCreditsAmount] = useState('')
  const [creditsRemark, setCreditsRemark] = useState('')
  const [vipDays, setVipDays] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', page, search],
    queryFn: async () => {
      const res = await userApi.getUserList({ page, page_size: 20, search })
      return res.data?.data || { items: [], total: 0 }
    },
  })

  const users = (data as { items: UserRecord[]; total: number })?.items || []
  const total = (data as { items: UserRecord[]; total: number })?.total || 0

  const createMutation = useMutation({
    mutationFn: () => userApi.createUser(createForm),
    onSuccess: () => { toast.success('User created'); setShowCreateModal(false); refetch() },
    onError: () => toast.error('Failed to create user'),
  })

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateUser(selectedUser!.id, editForm),
    onSuccess: () => { toast.success('User updated'); setShowEditModal(false); refetch() },
    onError: () => toast.error('Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => userApi.deleteUser(id),
    onSuccess: () => { toast.success('User deleted'); refetch() },
    onError: () => toast.error('Failed to delete'),
  })

  const creditsMutation = useMutation({
    mutationFn: () => userApi.setUserCredits({
      user_id: selectedUser!.id,
      credits: Number(creditsAmount),
      remark: creditsRemark,
    }),
    onSuccess: () => { toast.success('Credits updated'); setShowCreditsModal(false); refetch() },
    onError: () => toast.error('Failed to update credits'),
  })

  const vipMutation = useMutation({
    mutationFn: () => userApi.setUserVip({
      user_id: selectedUser!.id,
      vip_days: Number(vipDays),
    }),
    onSuccess: () => { toast.success('VIP updated'); setShowVipModal(false); refetch() },
    onError: () => toast.error('Failed to update VIP'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => userApi.resetUserPassword({
      user_id: selectedUser!.id,
      new_password: newPassword,
    }),
    onSuccess: () => { toast.success('Password reset'); setShowPasswordModal(false) },
    onError: () => toast.error('Failed to reset password'),
  })

  const openEdit = (user: UserRecord) => {
    setSelectedUser(user)
    setEditForm({ email: user.email || '', nickname: user.nickname || '', role: user.role, status: user.status })
    setShowEditModal(true)
  }

  const isVipActive = (expires: string) => new Date(expires) > new Date()

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><Users className="h-5 w-5" /> User Management</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage system users, roles and permissions</p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button onClick={() => { setCreateForm({ username: '', password: '', email: '', nickname: '', role: 'user' }); setShowCreateModal(true) }}>
            <Plus className="h-4 w-4 mr-1" /> Create User
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8 w-64"
            placeholder="Search by username/email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && setPage(1)}
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credits</TableHead>
                <TableHead>VIP</TableHead>
                <TableHead>Last Login</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
              ) : users.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
              ) : users.map(u => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{u.username}</div>
                      {u.email && <div className="text-xs text-muted-foreground">{u.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn('text-white text-xs', ROLE_COLORS[u.role] || 'bg-gray-500')}>{u.role}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.status === 'active' ? 'default' : 'destructive'}>{u.status}</Badge>
                  </TableCell>
                  <TableCell>{u.credits.toLocaleString()}</TableCell>
                  <TableCell>
                    {u.vip_expires_at && isVipActive(u.vip_expires_at) ? (
                      <Badge className="bg-yellow-500 text-white text-xs"><Crown className="h-3 w-3 mr-1" />{new Date(u.vip_expires_at).toLocaleDateString()}</Badge>
                    ) : <span className="text-muted-foreground">-</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}>
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedUser(u); setCreditsAmount(String(u.credits)); setCreditsRemark(''); setShowCreditsModal(true) }}>
                        <Wallet className="h-3.5 w-3.5 text-purple-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedUser(u); setVipDays('30'); setShowVipModal(true) }}>
                        <Crown className="h-3.5 w-3.5 text-yellow-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setSelectedUser(u); setNewPassword(''); setShowPasswordModal(true) }}>
                        <Key className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`Delete ${u.username}?`)) deleteMutation.mutate(u.id) }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {total > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm py-2">Page {page} of {Math.ceil(total / 20)}</span>
          <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}

      {/* Create User Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create User</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Username</Label><Input value={createForm.username} onChange={e => setCreateForm(p => ({ ...p, username: e.target.value }))} /></div>
            <div><Label>Password</Label><Input type="password" value={createForm.password} onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))} /></div>
            <div><Label>Email</Label><Input value={createForm.email} onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Role</Label>
              <Select value={createForm.role} onValueChange={v => setCreateForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={!createForm.username || !createForm.password}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User: {selectedUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Email</Label><Input value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} /></div>
            <div><Label>Nickname</Label><Input value={editForm.nickname} onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))} /></div>
            <div><Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(p => ({ ...p, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={editForm.status} onValueChange={v => setEditForm(p => ({ ...p, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancel</Button>
            <Button onClick={() => updateMutation.mutate()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Credits Modal */}
      <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adjust Credits: {selectedUser?.username}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Credits</Label><Input type="number" value={creditsAmount} onChange={e => setCreditsAmount(e.target.value)} /></div>
            <div><Label>Remark</Label><Input value={creditsRemark} onChange={e => setCreditsRemark(e.target.value)} placeholder="Reason for adjustment" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreditsModal(false)}>Cancel</Button>
            <Button onClick={() => creditsMutation.mutate()}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIP Modal */}
      <Dialog open={showVipModal} onOpenChange={setShowVipModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Set VIP: {selectedUser?.username}</DialogTitle></DialogHeader>
          <div><Label>VIP Days</Label><Input type="number" value={vipDays} onChange={e => setVipDays(e.target.value)} placeholder="30" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowVipModal(false)}>Cancel</Button>
            <Button onClick={() => vipMutation.mutate()}>Set VIP</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset Password: {selectedUser?.username}</DialogTitle></DialogHeader>
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
            <Button onClick={() => passwordMutation.mutate()} disabled={!newPassword}>Reset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
