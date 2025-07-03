// Supabase client configuration
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://vjjvhqncwonvbmujhohw.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqanZocW5jd29udmJtdWpob2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTEzODMsImV4cCI6MjA2NzA2NzM4M30.q1JZ0tFACyqR5ACC1bsPlqECLSr5v27kNdJhPJC82f0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database functions for purchases
export const purchaseService = {
  // Create a new purchase record
  async createPurchase(purchaseData) {
    const { data, error } = await supabase
      .from('purchases')
      .insert([
        {
          stripe_session_id: purchaseData.sessionId,
          customer_email: purchaseData.email,
          region: purchaseData.region,
          amount: purchaseData.amount,
          currency: purchaseData.currency,
          payment_status: purchaseData.status,
          stripe_payment_intent_id: purchaseData.paymentIntentId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating purchase:', error)
      throw error
    }
    
    return data
  },

  // Get all purchases for an email
  async getPurchasesByEmail(email) {
    const { data, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('customer_email', email.toLowerCase().trim())
      .eq('payment_status', 'completed')
    
    if (error) {
      console.error('Error fetching purchases:', error)
      throw error
    }
    
    return data || []
  },

  // Get purchased regions for an email
  async getPurchasedRegions(email) {
    const purchases = await this.getPurchasesByEmail(email)
    return purchases.map(p => p.region)
  },

  // Check if user has purchased a specific region
  async hasPurchasedRegion(email, region) {
    const regions = await this.getPurchasedRegions(email)
    return regions.includes(region)
  },

  // Update purchase status
  async updatePurchaseStatus(sessionId, status) {
    const { data, error } = await supabase
      .from('purchases')
      .update({ 
        payment_status: status,
        updated_at: new Date().toISOString()
      })
      .eq('stripe_session_id', sessionId)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating purchase status:', error)
      throw error
    }
    
    return data
  }
}

// Database functions for magic links
export const magicLinkService = {
  // Create a magic link token
  async createMagicLink(email, token, expiresAt) {
    const { data, error } = await supabase
      .from('magic_links')
      .insert([
        {
          email: email.toLowerCase().trim(),
          token,
          expires_at: expiresAt,
          used: false,
          created_at: new Date().toISOString()
        }
      ])
      .select()
      .single()
    
    if (error) {
      console.error('Error creating magic link:', error)
      throw error
    }
    
    return data
  },

  // Validate and use a magic link token
  async validateMagicLink(token) {
    const { data, error } = await supabase
      .from('magic_links')
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single()
    
    if (error) {
      console.error('Error validating magic link:', error)
      return null
    }
    
    // Check if token has expired
    if (new Date() > new Date(data.expires_at)) {
      return null
    }
    
    // Mark token as used
    await supabase
      .from('magic_links')
      .update({ used: true })
      .eq('id', data.id)
    
    return data
  },

  // Clean up expired magic links
  async cleanupExpiredLinks() {
    const { error } = await supabase
      .from('magic_links')
      .delete()
      .lt('expires_at', new Date().toISOString())
    
    if (error) {
      console.error('Error cleaning up expired links:', error)
    }
  }
}
