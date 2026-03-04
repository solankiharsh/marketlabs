import { PrivyClient } from '@privy-io/server-auth';
import { env } from './env';

// Only initialize Privy if we have real credentials (not dev placeholders)
const hasRealPrivyCredentials = 
  env.PRIVY_APP_ID && 
  env.PRIVY_APP_SECRET && 
  env.PRIVY_APP_ID !== 'dev-privy-app-id' &&
  env.PRIVY_APP_SECRET !== 'dev-privy-app-secret';

export const privy = hasRealPrivyCredentials
  ? (() => {
      console.log('[Privy] Initializing Privy client with App ID:', env.PRIVY_APP_ID?.substring(0, 10) + '...');
      return new PrivyClient(env.PRIVY_APP_ID!, env.PRIVY_APP_SECRET!);
    })()
  : (() => {
      console.warn('[Privy] Privy client not initialized - missing credentials');
      return null as any;
    })();

export interface PrivyTwitterData {
  username: string;
  name: string;
  profilePictureUrl?: string;
}

export interface PrivyUserData {
  privyId: string;
  walletAddress: string | null;
  email: string | null;
  twitter: PrivyTwitterData | null;
}

export async function verifyPrivyToken(token: string): Promise<PrivyUserData> {
  if (!privy) {
    throw new Error('Privy client not initialized. Please set PRIVY_APP_ID and PRIVY_APP_SECRET in backend/.env');
  }
  
  let verifiedClaims;
  let privyUser;
  
  try {
    console.log('[Privy] Verifying token...');
    verifiedClaims = await privy.verifyAuthToken(token);
    console.log('[Privy] Token verified, userId:', verifiedClaims.userId);
    
    privyUser = await privy.getUser(verifiedClaims.userId);
    console.log('[Privy] User fetched, linkedAccounts:', privyUser.linkedAccounts?.length || 0);
  } catch (error: any) {
    console.error('[Privy] Token verification failed:', error?.message || error);
    console.error('[Privy] Error details:', {
      name: error?.name,
      code: error?.code,
      status: error?.status,
      response: error?.response?.data,
      stack: error?.stack?.split('\n').slice(0, 3).join('\n'),
    });
    throw new Error(`Privy token verification failed: ${error?.message || 'Unknown error'}`);
  }

  // Extract wallet address
  const wallet = privyUser.linkedAccounts.find((account: any) => account.type === 'wallet');
  const walletAddress = wallet && 'address' in wallet ? wallet.address : null;

  // Extract email
  const emailAccount = privyUser.linkedAccounts.find((account: any) => account.type === 'email');
  const email = emailAccount && 'address' in emailAccount ? emailAccount.address : null;

  // Extract Twitter (OAuth linked account)
  const twitterAccount = privyUser.linkedAccounts.find(
    (account: any) => account.type === 'twitter_oauth'
  );
  const twitter: PrivyTwitterData | null =
    twitterAccount && 'username' in twitterAccount
      ? {
          username: (twitterAccount as any).username,
          name: (twitterAccount as any).name || (twitterAccount as any).username,
          profilePictureUrl: (twitterAccount as any).profilePictureUrl,
        }
      : null;

  return {
    privyId: privyUser.id,
    walletAddress,
    email,
    twitter,
  };
}

