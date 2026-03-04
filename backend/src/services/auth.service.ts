import { db } from '../lib/db';
import { generateTokens } from '../lib/jwt';
import { verifyPrivyToken } from '../lib/privy';

export async function login(privyToken: string) {
  // Verify Privy token
  const privyUser = await verifyPrivyToken(privyToken);

  // Get or create user
  let user = await db.user.findUnique({
    where: { privyId: privyUser.privyId },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        privyId: privyUser.privyId,
        wallet: privyUser.walletAddress,
        email: privyUser.email,
      },
    });
  } else {
    // Update user if wallet/email changed
    user = await db.user.update({
      where: { id: user.id },
      data: {
        wallet: privyUser.walletAddress || user.wallet,
        email: privyUser.email || user.email,
      },
    });
  }

  // Generate JWT tokens
  const tokens = await generateTokens(user.id, user.privyId, user.wallet || undefined);

  return {
    user: {
      id: user.id,
      privyId: user.privyId,
      wallet: user.wallet,
      email: user.email,
    },
    ...tokens,
  };
}

export async function refresh(refreshToken: string) {
  const { verifyRefreshToken } = await import('../lib/jwt');
  const payload = await verifyRefreshToken(refreshToken);

  const user = await db.user.findUnique({
    where: { privyId: payload.privyId },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const tokens = await generateTokens(user.id, user.privyId, user.wallet || undefined);

  return tokens;
}

