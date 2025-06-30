// Database utility functions for Supabase
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Create or get user
export async function createOrGetUser(email, stripeCustomerId = null) {
  try {
    // Try to find existing user
    const { data: existingUser, error: findError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (existingUser) {
      // Update Stripe customer ID if provided and not already set
      if (stripeCustomerId && !existingUser.stripe_customer_id) {
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({ stripe_customer_id: stripeCustomerId })
          .eq('id', existingUser.id)
          .select()
          .single();

        if (updateError) throw updateError;
        return updatedUser;
      }
      return existingUser;
    }

    // Create new user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email,
        stripe_customer_id: stripeCustomerId
      })
      .select()
      .single();

    if (createError) throw createError;
    return newUser;

  } catch (error) {
    console.error('Error creating/getting user:', error);
    throw error;
  }
}

// Create purchase record
export async function createPurchase(userId, sessionData, accessToken) {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000)); // 30 days

    const { data: purchase, error } = await supabase
      .from('purchases')
      .insert({
        user_id: userId,
        stripe_session_id: sessionData.id,
        stripe_payment_intent_id: sessionData.payment_intent,
        region: sessionData.metadata.region,
        access_token: accessToken,
        amount: sessionData.amount_total,
        currency: sessionData.currency,
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (error) throw error;
    return purchase;

  } catch (error) {
    console.error('Error creating purchase:', error);
    throw error;
  }
}

// Get user's active tokens
export async function getUserActiveTokens(email) {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        access_token,
        region,
        expires_at,
        purchase_date,
        status,
        users!inner(email)
      `)
      .eq('users.email', email)
      .eq('status', 'active')
      .gt('expires_at', new Date().toISOString());

    if (error) throw error;

    return data.map(purchase => ({
      token: purchase.access_token,
      region: purchase.region,
      expiresAt: purchase.expires_at,
      purchaseDate: purchase.purchase_date,
      daysRemaining: Math.ceil((new Date(purchase.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
    }));

  } catch (error) {
    console.error('Error getting user active tokens:', error);
    throw error;
  }
}

// Validate token
export async function validateToken(token, email) {
  try {
    const { data, error } = await supabase
      .from('purchases')
      .select(`
        *,
        users!inner(*)
      `)
      .eq('access_token', token)
      .eq('users.email', email)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { valid: false, error: 'Token not found or email mismatch' };
      }
      throw error;
    }

    // Check if token is expired
    if (new Date() > new Date(data.expires_at)) {
      return { valid: false, error: 'Token has expired' };
    }

    // Check if token is active
    if (data.status !== 'active') {
      return { valid: false, error: 'Token not activated' };
    }

    return {
      valid: true,
      data: {
        token: data.access_token,
        region: data.region,
        expiresAt: data.expires_at,
        userId: data.user_id,
        email: data.users.email,
        daysRemaining: Math.ceil((new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
      }
    };

  } catch (error) {
    console.error('Error validating token:', error);
    return { valid: false, error: 'Server error' };
  }
}

// Get user profile with all data
export async function getUserProfile(email) {
  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError) {
      if (userError.code === 'PGRST116') {
        return { error: 'User not found' };
      }
      throw userError;
    }

    const { data: purchases, error: purchasesError } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', user.id)
      .order('purchase_date', { ascending: false });

    if (purchasesError) throw purchasesError;

    const activeTokens = purchases
      .filter(p => p.status === 'active' && new Date(p.expires_at) > new Date())
      .map(p => ({
        token: p.access_token,
        region: p.region,
        expiresAt: p.expires_at,
        purchaseDate: p.purchase_date,
        daysRemaining: Math.ceil((new Date(p.expires_at) - new Date()) / (1000 * 60 * 60 * 24))
      }));

    return {
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
        stripeCustomerId: user.stripe_customer_id
      },
      purchases: purchases.map(p => ({
        id: p.id,
        region: p.region,
        amount: p.amount,
        currency: p.currency,
        purchaseDate: p.purchase_date,
        expiresAt: p.expires_at,
        status: p.status,
        accessToken: p.access_token
      })),
      activeTokens,
      statistics: {
        totalPurchases: purchases.length,
        activeTokens: activeTokens.length,
        totalSpent: purchases.reduce((sum, p) => sum + (p.amount || 0), 0)
      }
    };

  } catch (error) {
    console.error('Error getting user profile:', error);
    return { error: 'Server error' };
  }
}
