'use client';

import { useState, useEffect, useCallback } from 'react';
import { User } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { ProfileCard } from '@/components/profile/ProfileCard';
import { CreditsCard } from '@/components/profile/CreditsCard';
import { InviteFriendsCard } from '@/components/profile/InviteFriendsCard';
import { TabBasicInfo } from '@/components/profile/TabBasicInfo';
import { TabChangePassword } from '@/components/profile/TabChangePassword';
import { TabCreditsHistory } from '@/components/profile/TabCreditsHistory';
import { TabNotificationSettings } from '@/components/profile/TabNotificationSettings';
import { TabExchangeConfig } from '@/components/profile/TabExchangeConfig';
import { TabReferrals } from '@/components/profile/TabReferrals';
import {
  getProfileData,
  getCredits,
  getReferralsData,
} from '@/lib/api/profile-membership';
import type { UserProfile, CreditsInfo, ReferralData } from '@/lib/api/profile-membership';

export default function MyProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [credits, setCredits] = useState<CreditsInfo | null>(null);
  const [referrals, setReferrals] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    Promise.all([
      getProfileData().then(setProfile),
      getCredits().then(setCredits),
      getReferralsData().then(setReferrals),
    ]).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => load(), [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-[var(--text-muted)]">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-[var(--text-primary)]">
          <User className="h-7 w-7" />
          My Profile
        </h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <ProfileCard profile={profile} enterDelay={0} />
        </div>
        <div>
          <CreditsCard credits={credits} enterDelay={1} />
        </div>
        <div>
          <InviteFriendsCard data={referrals} enterDelay={2} />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 shadow-[0_4px_6px_rgba(0,0,0,0.3)]">
        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="mb-4 flex flex-wrap gap-1 border-b border-[var(--border)] bg-transparent p-0">
            <TabsTrigger
              value="basic"
              className="rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-[var(--gold)] data-[state=active]:text-[var(--gold)]"
            >
              Basic Info
            </TabsTrigger>
            <TabsTrigger
              value="password"
              className="rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-[var(--gold)] data-[state=active]:text-[var(--gold)]"
            >
              Change Password
            </TabsTrigger>
            <TabsTrigger
              value="credits"
              className="rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-[var(--gold)] data-[state=active]:text-[var(--gold)]"
            >
              Credits History
            </TabsTrigger>
            <TabsTrigger
              value="notifications"
              className="rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-[var(--gold)] data-[state=active]:text-[var(--gold)]"
            >
              Notification Settings
            </TabsTrigger>
            <TabsTrigger
              value="exchange"
              className="rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-[var(--gold)] data-[state=active]:text-[var(--gold)]"
            >
              Exchange Config
            </TabsTrigger>
            <TabsTrigger
              value="referrals"
              className="rounded-none border-b-2 border-transparent bg-transparent data-[state=active]:border-[var(--gold)] data-[state=active]:text-[var(--gold)]"
            >
              Referrals
            </TabsTrigger>
          </TabsList>
          <TabsContent value="basic" className="mt-4">
            <TabBasicInfo profile={profile} onUpdated={load} />
          </TabsContent>
          <TabsContent value="password" className="mt-4">
            <TabChangePassword email={profile?.email} />
          </TabsContent>
          <TabsContent value="credits" className="mt-4">
            <TabCreditsHistory />
          </TabsContent>
          <TabsContent value="notifications" className="mt-4">
            <TabNotificationSettings />
          </TabsContent>
          <TabsContent value="exchange" className="mt-4">
            <TabExchangeConfig />
          </TabsContent>
          <TabsContent value="referrals" className="mt-4">
            <TabReferrals />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
