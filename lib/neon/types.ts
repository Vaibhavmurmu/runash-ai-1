export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          created_at: string
          updated_at: string | null
          email: string
          full_name: string | null
          phone: string | null
          avatar_url: string | null
          balance: number
          is_verified: boolean
          kyc_status: "pending" | "verified" | "rejected"
        }
        Insert: {
          id: string
          created_at?: string
          updated_at?: string | null
          email: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          balance?: number
          is_verified?: boolean
          kyc_status?: "pending" | "verified" | "rejected"
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string | null
          email?: string
          full_name?: string | null
          phone?: string | null
          avatar_url?: string | null
          balance?: number
          is_verified?: boolean
          kyc_status?: "pending" | "verified" | "rejected"
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          id: string
          user_id: string
          account_number: string
          ifsc_code: string | null
          bank_name: string
          account_holder_name: string
          account_type: string
          balance: number
          currency: string
          is_primary: boolean
          is_active: boolean
          archived_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          account_number: string
          ifsc_code?: string | null
          bank_name: string
          account_holder_name: string
          account_type?: string
          balance?: number
          currency?: string
          is_primary?: boolean
          is_active?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          account_number?: string
          ifsc_code?: string | null
          bank_name?: string
          account_holder_name?: string
          account_type?: string
          balance?: number
          currency?: string
          is_primary?: boolean
          is_active?: boolean
          archived_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      transactions: {
        Row: {
          id: string
          transaction_id: string
          sender_id: string | null
          receiver_id: string | null
          amount: number
          currency: string
          exchange_rate: number | null
          converted_amount: number | null
          transaction_type: string
          status: string
          payment_method: string
          gateway_transaction_id: string | null
          gateway_response: Json | null
          note: string | null
          failure_reason: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          sender_id?: string | null
          receiver_id?: string | null
          amount: number
          currency?: string
          exchange_rate?: number | null
          converted_amount?: number | null
          transaction_type: string
          status?: string
          payment_method?: string
          gateway_transaction_id?: string | null
          gateway_response?: Json | null
          note?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          sender_id?: string | null
          receiver_id?: string | null
          amount?: number
          currency?: string
          exchange_rate?: number | null
          converted_amount?: number | null
          transaction_type?: string
          status?: string
          payment_method?: string
          gateway_transaction_id?: string | null
          gateway_response?: Json | null
          note?: string | null
          failure_reason?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      bill_categories: {
        Row: {
          id: string
          name: string
          slug: string
          icon: string
          description: string | null
          is_active: boolean
          sort_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          icon: string
          description?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          icon?: string
          description?: string | null
          is_active?: boolean
          sort_order?: number
          created_at?: string
        }
      }
      bill_providers: {
        Row: {
          id: string
          category_id: string
          name: string
          slug: string
          logo_url: string | null
          is_active: boolean
          supports_fetch: boolean
          convenience_fee: number
          created_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          slug: string
          logo_url?: string | null
          is_active?: boolean
          supports_fetch?: boolean
          convenience_fee?: number
          created_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          slug?: string
          logo_url?: string | null
          is_active?: boolean
          supports_fetch?: boolean
          convenience_fee?: number
          created_at?: string
        }
      }
      user_bills: {
        Row: {
          id: string
          user_id: string
          provider_id: string
          account_number: string
          nickname: string | null
          auto_pay: boolean
          reminder_days: number
          is_favorite: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          provider_id: string
          account_number: string
          nickname?: string | null
          auto_pay?: boolean
          reminder_days?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          provider_id?: string
          account_number?: string
          nickname?: string | null
          auto_pay?: boolean
          reminder_days?: number
          is_favorite?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      upi_ids: {
        Row: {
          id: string
          user_id: string
          upi_id: string
          provider: string
          is_primary: boolean
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          upi_id: string
          provider: string
          is_primary?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          upi_id?: string
          provider?: string
          is_primary?: boolean
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      payment_links: {
        Row: {
          id: string
          user_id: string
          link_id: string
          title: string
          description: string | null
          amount: number
          currency: string
          is_fixed_amount: boolean
          min_amount: number | null
          max_amount: number | null
          expires_at: string | null
          is_active: boolean
          usage_count: number
          max_usage: number | null
          success_url: string | null
          cancel_url: string | null
          webhook_url: string | null
          metadata: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          link_id: string
          title: string
          description?: string | null
          amount: number
          currency?: string
          is_fixed_amount?: boolean
          min_amount?: number | null
          max_amount?: number | null
          expires_at?: string | null
          is_active?: boolean
          usage_count?: number
          max_usage?: number | null
          success_url?: string | null
          cancel_url?: string | null
          webhook_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          link_id?: string
          title?: string
          description?: string | null
          amount?: number
          currency?: string
          is_fixed_amount?: boolean
          min_amount?: number | null
          max_amount?: number | null
          expires_at?: string | null
          is_active?: boolean
          usage_count?: number
          max_usage?: number | null
          success_url?: string | null
          cancel_url?: string | null
          webhook_url?: string | null
          metadata?: Json | null
          created_at?: string
          updated_at?: string
        }
      }
      payment_link_transactions: {
        Row: {
          id: string
          payment_link_id: string
          transaction_id: string
          payer_email: string | null
          payer_name: string | null
          payer_phone: string | null
          amount_paid: number
          currency: string
          status: string
          created_at: string
        }
        Insert: {
          id?: string
          payment_link_id: string
          transaction_id: string
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          amount_paid: number
          currency?: string
          status?: string
          created_at?: string
        }
        Update: {
          id?: string
          payment_link_id?: string
          transaction_id?: string
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          amount_paid?: number
          currency?: string
          status?: string
          created_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          message: string
          type: string
          is_read: boolean
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          message: string
          type: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          message?: string
          type?: string
          is_read?: boolean
          metadata?: Json | null
          created_at?: string
        }
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          device_id: string
          device_name: string
          ip_address: string
          user_agent: string
          is_active: boolean
          last_activity: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_id: string
          device_name: string
          ip_address: string
          user_agent: string
          is_active?: boolean
          last_activity?: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string
          device_name?: string
          ip_address?: string
          user_agent?: string
          is_active?: boolean
          last_activity?: string
          created_at?: string
        }
      }
      biometric_tokens: {
        Row: {
          id: string
          user_id: string
          device_id: string
          token_hash: string
          public_key: string
          is_active: boolean
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          device_id: string
          token_hash: string
          public_key: string
          is_active?: boolean
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          device_id?: string
          token_hash?: string
          public_key?: string
          is_active?: boolean
          expires_at?: string
          created_at?: string
        }
      }
      exchange_rates: {
        Row: {
          id: string
          from_currency: string
          to_currency: string
          rate: number
          updated_at: string
        }
        Insert: {
          id?: string
          from_currency: string
          to_currency: string
          rate: number
          updated_at?: string
        }
        Update: {
          id?: string
          from_currency?: string
          to_currency?: string
          rate?: number
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      transfer_funds: {
        Args: {
          sender_id: string
          receiver_id: string
          amount: number
        }
        Returns: boolean
      }
      get_exchange_rate: {
        Args: {
          from_currency: string
          to_currency: string
        }
        Returns: number
      }
      create_payment_link: {
        Args: {
          user_id: string
          title: string
          amount: number
          currency: string
        }
        Returns: string
      }
    }
    Enums: {
      transaction_status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED"
      transaction_type: "SEND" | "RECEIVE" | "PAYMENT_LINK" | "BILL_PAYMENT"
      notification_type: "TRANSACTION" | "PAYMENT_REQUEST" | "SECURITY" | "SYSTEM"
      account_type: "SAVINGS" | "CHECKING" | "CREDIT"
    }
  }
          }
