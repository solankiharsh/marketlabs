import { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  User, Mail, Calendar, Crown, Wallet, Users, Copy, Gift, Lock, Loader2, Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import * as userApi from '@/api/user'
export default function ProfilePage() {
  const [nickname, setNickname] = useState('')
  const [email, setEmail] = useState('')
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const { data: profile = {} as Record<string, unknown> } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await userApi.getProfile()
      return (res.data?.data || {}) as Record<string, unknown>
    },
  })

  const { data: referralData = {} as Record<string, unknown> } = useQuery({
    queryKey: ['profile-referrals'],
    queryFn: async () => {
      const res = await userApi.getMyReferrals({ page: 1, page_size: 1 })
      return (res.data?.data || {}) as Record<string, unknown>
    },
  })

  useEffect(() => {
    if (profile.nickname) setNickname(profile.nickname as string)
    if (profile.email) setEmail(profile.email as string)
  }, [profile])

  const updateMutation = useMutation({
    mutationFn: () => userApi.updateProfile({ nickname, email }),
    onSuccess: () => toast.success('Profile updated'),
    onError: () => toast.error('Failed to update'),
  })

  const passwordMutation = useMutation({
    mutationFn: () => userApi.changePassword({ old_password: oldPassword, new_password: newPassword }),
    onSuccess: () => { toast.success('Password changed'); setOldPassword(''); setNewPassword('') },
    onError: () => toast.error('Failed to change password'),
  })

  const referralLink = `${window.location.origin}/#/login?ref=${profile.referral_code || ''}`
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink)
    toast.success('Referral link copied')
  }

  const credits = (profile.credits as number) || 0
  const isVip = !!(profile.is_vip || (profile.vip_expires_at && new Date(profile.vip_expires_at as string) > new Date()))
  const role = (profile.role as string) || 'user'

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><User className="h-5 w-5" /> My Profile</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg">{(profile.nickname as string) || (profile.username as string)}</h3>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Badge variant={role === 'admin' ? 'default' : 'secondary'}>{role}</Badge>
              {isVip && <Badge className="bg-yellow-500 text-white"><Crown className="h-3 w-3 mr-1" /> VIP</Badge>}
            </div>
            <div className="mt-4 space-y-2 text-sm text-left">
              <div className="flex items-center gap-2">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Username:</span>
                <span>{profile.username as string}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{(profile.email as string) || '-'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">Last Login:</span>
                <span>{profile.last_login_at ? new Date(profile.last_login_at as string).toLocaleDateString() : '-'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Credits + Referral */}
        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-1.5"><Wallet className="h-4 w-4" /> My Credits</CardTitle></CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{credits.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">credits</div>
              {!!profile.vip_expires_at && (
                <div className="mt-2 text-sm flex items-center gap-1">
                  <Crown className={isVip ? 'h-4 w-4 text-yellow-500' : 'h-4 w-4 text-muted-foreground'} />
                  {isVip ? `VIP until ${new Date(profile.vip_expires_at as string).toLocaleDateString()}` : 'VIP expired'}
                </div>
              )}
              <Button className="mt-4 w-full" onClick={() => window.location.href = '/billing'}>
                Subscribe / Recharge
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-1.5"><Users className="h-4 w-4" /> Invite Friends</CardTitle></CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{(referralData.total as number) || 0}</div>
                  <div className="text-xs text-muted-foreground">Invited</div>
                </div>
                {(referralData.referral_bonus as number) > 0 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-500">+{referralData.referral_bonus as number}</div>
                    <div className="text-xs text-muted-foreground">Per invite</div>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="text-xs" />
                <Button size="icon" variant="outline" onClick={copyReferralLink}><Copy className="h-4 w-4" /></Button>
              </div>
              {(referralData.register_bonus as number) > 0 && (
                <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                  <Gift className="h-3 w-3" /> New users get {referralData.register_bonus as number} credits
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit tabs */}
      <Card>
        <CardContent className="p-6">
          <Tabs defaultValue="basic">
            <TabsList>
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="password">Change Password</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Nickname</Label>
                  <Input value={nickname} onChange={e => setNickname(e.target.value)} />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Save Changes
              </Button>
            </TabsContent>

            <TabsContent value="password" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Current Password</Label>
                  <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                </div>
                <div>
                  <Label>New Password</Label>
                  <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
              </div>
              <Button onClick={() => passwordMutation.mutate()} disabled={passwordMutation.isPending || !oldPassword || !newPassword}>
                <Lock className="h-4 w-4 mr-1" /> Change Password
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
