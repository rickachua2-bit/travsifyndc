export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      api_access_requests: {
        Row: {
          company: string
          country: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          monthly_volume: string | null
          status: string
          use_case: string | null
          user_id: string | null
          verticals: string[]
        }
        Insert: {
          company: string
          country?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          monthly_volume?: string | null
          status?: string
          use_case?: string | null
          user_id?: string | null
          verticals?: string[]
        }
        Update: {
          company?: string
          country?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          monthly_volume?: string | null
          status?: string
          use_case?: string | null
          user_id?: string | null
          verticals?: string[]
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          environment: string
          id: string
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string | null
          rate_limit_per_minute: number
          revoked_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          environment: string
          id?: string
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name?: string | null
          rate_limit_per_minute?: number
          revoked_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string
          id?: string
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string | null
          rate_limit_per_minute?: number
          revoked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      api_logs: {
        Row: {
          api_key_id: string | null
          created_at: string
          endpoint: string
          environment: string
          error_code: string | null
          id: string
          ip_address: string | null
          latency_ms: number | null
          method: string
          provider: string | null
          request_id: string | null
          status_code: number
          user_agent: string | null
          user_id: string | null
          vertical: string | null
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          endpoint: string
          environment: string
          error_code?: string | null
          id?: string
          ip_address?: string | null
          latency_ms?: number | null
          method: string
          provider?: string | null
          request_id?: string | null
          status_code: number
          user_agent?: string | null
          user_id?: string | null
          vertical?: string | null
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          endpoint?: string
          environment?: string
          error_code?: string | null
          id?: string
          ip_address?: string | null
          latency_ms?: number | null
          method?: string
          provider?: string | null
          request_id?: string | null
          status_code?: number
          user_agent?: string | null
          user_id?: string | null
          vertical?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string | null
          country: string | null
          created_at: string
          currency: string
          iban: string | null
          id: string
          is_default: boolean
          routing_number: string | null
          swift_code: string | null
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          currency: string
          iban?: string | null
          id?: string
          is_default?: boolean
          routing_number?: string | null
          swift_code?: string | null
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string | null
          country?: string | null
          created_at?: string
          currency?: string
          iban?: string | null
          id?: string
          is_default?: boolean
          routing_number?: string | null
          swift_code?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          api_key_id: string | null
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string | null
          environment: string
          fulfillment_mode: string
          id: string
          margin_amount: number
          metadata: Json
          provider: string
          provider_reference: string | null
          reference: string
          status: string
          stripe_payment_intent: string | null
          total_amount: number
          updated_at: string
          user_id: string
          vertical: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          environment: string
          fulfillment_mode?: string
          id?: string
          margin_amount?: number
          metadata?: Json
          provider: string
          provider_reference?: string | null
          reference: string
          status?: string
          stripe_payment_intent?: string | null
          total_amount?: number
          updated_at?: string
          user_id: string
          vertical: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string | null
          environment?: string
          fulfillment_mode?: string
          id?: string
          margin_amount?: number
          metadata?: Json
          provider?: string
          provider_reference?: string | null
          reference?: string
          status?: string
          stripe_payment_intent?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string
          vertical?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          inquiry_type: string
          message: string
          name: string
          user_id: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          inquiry_type?: string
          message: string
          name: string
          user_id?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          inquiry_type?: string
          message?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fincra_virtual_accounts: {
        Row: {
          account_name: string
          account_number: string
          bank_code: string | null
          bank_name: string
          created_at: string
          currency: string
          provider_reference: string
          status: string
          user_id: string
        }
        Insert: {
          account_name: string
          account_number: string
          bank_code?: string | null
          bank_name: string
          created_at?: string
          currency?: string
          provider_reference: string
          status?: string
          user_id: string
        }
        Update: {
          account_name?: string
          account_number?: string
          bank_code?: string | null
          bank_name?: string
          created_at?: string
          currency?: string
          provider_reference?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      insurance_quote_cache: {
        Row: {
          created_at: string
          destination: string
          duration_bucket: number
          id: string
          last_scraped_at: string
          max_age: number
          nationality: string
          quotes: Json
          travelers_count: number
        }
        Insert: {
          created_at?: string
          destination: string
          duration_bucket: number
          id?: string
          last_scraped_at?: string
          max_age: number
          nationality: string
          quotes?: Json
          travelers_count: number
        }
        Update: {
          created_at?: string
          destination?: string
          duration_bucket?: number
          id?: string
          last_scraped_at?: string
          max_age?: number
          nationality?: string
          quotes?: Json
          travelers_count?: number
        }
        Relationships: []
      }
      kyc_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["kyc_status"] | null
          id: string
          reason: string | null
          to_status: Database["public"]["Enums"]["kyc_status"] | null
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["kyc_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["kyc_status"] | null
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["kyc_status"] | null
          id?: string
          reason?: string | null
          to_status?: Database["public"]["Enums"]["kyc_status"] | null
          user_id?: string
        }
        Relationships: []
      }
      kyc_drafts: {
        Row: {
          current_step: number
          form_data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          current_step?: number
          form_data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          current_step?: number
          form_data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      markups: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          is_active: boolean
          markup_type: Database["public"]["Enums"]["markup_value_type"]
          markup_value: number
          owner_id: string | null
          owner_type: Database["public"]["Enums"]["markup_owner_type"]
          updated_at: string
          vertical: Database["public"]["Enums"]["travel_vertical"]
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          markup_type: Database["public"]["Enums"]["markup_value_type"]
          markup_value: number
          owner_id?: string | null
          owner_type: Database["public"]["Enums"]["markup_owner_type"]
          updated_at?: string
          vertical: Database["public"]["Enums"]["travel_vertical"]
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_active?: boolean
          markup_type?: Database["public"]["Enums"]["markup_value_type"]
          markup_value?: number
          owner_id?: string | null
          owner_type?: Database["public"]["Enums"]["markup_owner_type"]
          updated_at?: string
          vertical?: Database["public"]["Enums"]["travel_vertical"]
        }
        Relationships: []
      }
      payouts: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          currency: string
          id: string
          metadata: Json
          provider: string
          provider_reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          currency: string
          id?: string
          metadata?: Json
          provider?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          provider?: string
          provider_reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          business_address: Json | null
          business_type: string | null
          company: string | null
          contact_phone: string | null
          contact_role: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          incorporation_country: string | null
          kyc_reviewed_at: string | null
          kyc_reviewed_by: string | null
          kyc_status: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at: string | null
          legal_name: string | null
          live_api_key: string | null
          monthly_volume: string | null
          registration_number: string | null
          rejection_reason: string | null
          role_title: string | null
          sandbox_api_key: string | null
          target_verticals: string[] | null
          trading_name: string | null
          updated_at: string
          use_case: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          business_address?: Json | null
          business_type?: string | null
          company?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          incorporation_country?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          legal_name?: string | null
          live_api_key?: string | null
          monthly_volume?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          role_title?: string | null
          sandbox_api_key?: string | null
          target_verticals?: string[] | null
          trading_name?: string | null
          updated_at?: string
          use_case?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          business_address?: Json | null
          business_type?: string | null
          company?: string | null
          contact_phone?: string | null
          contact_role?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          incorporation_country?: string | null
          kyc_reviewed_at?: string | null
          kyc_reviewed_by?: string | null
          kyc_status?: Database["public"]["Enums"]["kyc_status"]
          kyc_submitted_at?: string | null
          legal_name?: string | null
          live_api_key?: string | null
          monthly_volume?: string | null
          registration_number?: string | null
          rejection_reason?: string | null
          role_title?: string | null
          sandbox_api_key?: string | null
          target_verticals?: string[] | null
          trading_name?: string | null
          updated_at?: string
          use_case?: string | null
          website?: string | null
        }
        Relationships: []
      }
      rate_limit_buckets: {
        Row: {
          api_key_id: string
          request_count: number
          window_start: string
        }
        Insert: {
          api_key_id: string
          request_count?: number
          window_start: string
        }
        Update: {
          api_key_id?: string
          request_count?: number
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_buckets_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_cards: {
        Row: {
          brand: string | null
          created_at: string
          exp_month: number | null
          exp_year: number | null
          id: string
          is_default: boolean
          last4: string | null
          provider: string
          provider_payment_method_id: string
          user_id: string
        }
        Insert: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          provider_payment_method_id: string
          user_id: string
        }
        Update: {
          brand?: string | null
          created_at?: string
          exp_month?: number | null
          exp_year?: number | null
          id?: string
          is_default?: boolean
          last4?: string | null
          provider?: string
          provider_payment_method_id?: string
          user_id?: string
        }
        Relationships: []
      }
      stripe_customers: {
        Row: {
          created_at: string
          stripe_customer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          stripe_customer_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          stripe_customer_id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      visa_application_documents: {
        Row: {
          application_id: string
          document_label: string | null
          document_type: string
          file_name: string
          id: string
          metadata: Json
          mime_type: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          size_bytes: number | null
          status: Database["public"]["Enums"]["visa_document_status"]
          storage_path: string
          traveler_id: string | null
          uploaded_at: string
        }
        Insert: {
          application_id: string
          document_label?: string | null
          document_type: string
          file_name: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["visa_document_status"]
          storage_path: string
          traveler_id?: string | null
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          document_label?: string | null
          document_type?: string
          file_name?: string
          id?: string
          metadata?: Json
          mime_type?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          size_bytes?: number | null
          status?: Database["public"]["Enums"]["visa_document_status"]
          storage_path?: string
          traveler_id?: string | null
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_application_documents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "visa_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "visa_application_documents_traveler_id_fkey"
            columns: ["traveler_id"]
            isOneToOne: false
            referencedRelation: "visa_application_travelers"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_application_events: {
        Row: {
          actor_id: string | null
          application_id: string
          created_at: string
          event_type: string
          id: string
          is_customer_visible: boolean
          message: string | null
          metadata: Json
        }
        Insert: {
          actor_id?: string | null
          application_id: string
          created_at?: string
          event_type: string
          id?: string
          is_customer_visible?: boolean
          message?: string | null
          metadata?: Json
        }
        Update: {
          actor_id?: string | null
          application_id?: string
          created_at?: string
          event_type?: string
          id?: string
          is_customer_visible?: boolean
          message?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "visa_application_events_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "visa_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_application_travelers: {
        Row: {
          application_id: string
          created_at: string
          date_of_birth: string | null
          full_name: string
          gender: string | null
          given_names: string | null
          id: string
          is_primary: boolean
          marital_status: string | null
          metadata: Json
          nationality: string | null
          occupation: string | null
          passport_expiry_date: string | null
          passport_issue_date: string | null
          passport_issuing_country: string | null
          passport_number: string | null
          position: number
          surname: string | null
          updated_at: string
        }
        Insert: {
          application_id: string
          created_at?: string
          date_of_birth?: string | null
          full_name: string
          gender?: string | null
          given_names?: string | null
          id?: string
          is_primary?: boolean
          marital_status?: string | null
          metadata?: Json
          nationality?: string | null
          occupation?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_issuing_country?: string | null
          passport_number?: string | null
          position?: number
          surname?: string | null
          updated_at?: string
        }
        Update: {
          application_id?: string
          created_at?: string
          date_of_birth?: string | null
          full_name?: string
          gender?: string | null
          given_names?: string | null
          id?: string
          is_primary?: boolean
          marital_status?: string | null
          metadata?: Json
          nationality?: string | null
          occupation?: string | null
          passport_expiry_date?: string | null
          passport_issue_date?: string | null
          passport_issuing_country?: string | null
          passport_number?: string | null
          position?: number
          surname?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_application_travelers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "visa_applications"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_applications: {
        Row: {
          accommodation_address: string | null
          arrival_date: string | null
          assigned_admin_id: string | null
          booking_id: string | null
          created_at: string
          currency: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          delivered_at: string | null
          departure_date: string | null
          documents_verified_at: string | null
          embassy_decision_at: string | null
          embassy_reference: string | null
          flight_number: string | null
          id: string
          internal_notes: string | null
          metadata: Json
          purpose_of_visit: string | null
          reference: string
          refund_amount: number | null
          refund_reference: string | null
          refunded_at: string | null
          rejection_reason: string | null
          sent_to_embassy_at: string | null
          service_fee: number
          status: Database["public"]["Enums"]["visa_application_status"]
          submitted_at: string | null
          total_amount: number
          updated_at: string
          user_id: string | null
          visa_fee: number
          visa_pdf_path: string | null
          visa_pdf_uploaded_at: string | null
          visa_product_id: string
        }
        Insert: {
          accommodation_address?: string | null
          arrival_date?: string | null
          assigned_admin_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          delivered_at?: string | null
          departure_date?: string | null
          documents_verified_at?: string | null
          embassy_decision_at?: string | null
          embassy_reference?: string | null
          flight_number?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json
          purpose_of_visit?: string | null
          reference: string
          refund_amount?: number | null
          refund_reference?: string | null
          refunded_at?: string | null
          rejection_reason?: string | null
          sent_to_embassy_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["visa_application_status"]
          submitted_at?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          visa_fee?: number
          visa_pdf_path?: string | null
          visa_pdf_uploaded_at?: string | null
          visa_product_id: string
        }
        Update: {
          accommodation_address?: string | null
          arrival_date?: string | null
          assigned_admin_id?: string | null
          booking_id?: string | null
          created_at?: string
          currency?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          delivered_at?: string | null
          departure_date?: string | null
          documents_verified_at?: string | null
          embassy_decision_at?: string | null
          embassy_reference?: string | null
          flight_number?: string | null
          id?: string
          internal_notes?: string | null
          metadata?: Json
          purpose_of_visit?: string | null
          reference?: string
          refund_amount?: number | null
          refund_reference?: string | null
          refunded_at?: string | null
          rejection_reason?: string | null
          sent_to_embassy_at?: string | null
          service_fee?: number
          status?: Database["public"]["Enums"]["visa_application_status"]
          submitted_at?: string | null
          total_amount?: number
          updated_at?: string
          user_id?: string | null
          visa_fee?: number
          visa_pdf_path?: string | null
          visa_pdf_uploaded_at?: string | null
          visa_product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "visa_applications_visa_product_id_fkey"
            columns: ["visa_product_id"]
            isOneToOne: false
            referencedRelation: "visa_products"
            referencedColumns: ["id"]
          },
        ]
      }
      visa_products: {
        Row: {
          base_price: number
          created_at: string
          currency: string
          description: string | null
          destination: string
          destination_name: string
          display_order: number
          entry_type: string
          id: string
          image_url: string | null
          is_active: boolean
          last_scraped_at: string | null
          max_stay_days: number
          nationality: string
          nationality_name: string
          processing_days_max: number
          processing_days_min: number
          requirements: Json
          retail_price: number
          sherpa_url: string | null
          updated_at: string
          validity_days: number
          visa_type: string
        }
        Insert: {
          base_price: number
          created_at?: string
          currency?: string
          description?: string | null
          destination: string
          destination_name: string
          display_order?: number
          entry_type?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_scraped_at?: string | null
          max_stay_days: number
          nationality: string
          nationality_name: string
          processing_days_max: number
          processing_days_min: number
          requirements?: Json
          retail_price: number
          sherpa_url?: string | null
          updated_at?: string
          validity_days: number
          visa_type: string
        }
        Update: {
          base_price?: number
          created_at?: string
          currency?: string
          description?: string | null
          destination?: string
          destination_name?: string
          display_order?: number
          entry_type?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_scraped_at?: string | null
          max_stay_days?: number
          nationality?: string
          nationality_name?: string
          processing_days_max?: number
          processing_days_min?: number
          requirements?: Json
          retail_price?: number
          sherpa_url?: string | null
          updated_at?: string
          validity_days?: number
          visa_type?: string
        }
        Relationships: []
      }
      visa_scrape_runs: {
        Row: {
          completed_at: string | null
          errors: Json
          failed_count: number
          id: string
          metadata: Json
          scraped_count: number
          started_at: string
          started_by: string | null
          status: string
          total_corridors: number
          upserted_count: number
        }
        Insert: {
          completed_at?: string | null
          errors?: Json
          failed_count?: number
          id?: string
          metadata?: Json
          scraped_count?: number
          started_at?: string
          started_by?: string | null
          status?: string
          total_corridors?: number
          upserted_count?: number
        }
        Update: {
          completed_at?: string | null
          errors?: Json
          failed_count?: number
          id?: string
          metadata?: Json
          scraped_count?: number
          started_at?: string
          started_by?: string | null
          status?: string
          total_corridors?: number
          upserted_count?: number
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          booking_id: string | null
          category: string
          created_at: string
          currency: string
          description: string | null
          direction: string
          id: string
          metadata: Json
          provider: string | null
          provider_reference: string | null
          reference: string
          status: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          booking_id?: string | null
          category: string
          created_at?: string
          currency: string
          description?: string | null
          direction: string
          id?: string
          metadata?: Json
          provider?: string | null
          provider_reference?: string | null
          reference: string
          status?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          booking_id?: string | null
          category?: string
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          id?: string
          metadata?: Json
          provider?: string | null
          provider_reference?: string | null
          reference?: string
          status?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          created_at: string
          currency: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          currency: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          currency?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      withdrawal_requests: {
        Row: {
          admin_notes: string | null
          amount: number
          approved_at: string | null
          approved_by: string | null
          bank_account_id: string
          created_at: string
          currency: string
          fee: number
          id: string
          net_amount: number
          paid_at: string | null
          provider: string | null
          provider_reference: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          user_id: string
          wallet_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id: string
          created_at?: string
          currency: string
          fee?: number
          id?: string
          net_amount: number
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id: string
          wallet_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          bank_account_id?: string
          created_at?: string
          currency?: string
          fee?: number
          id?: string
          net_amount?: number
          paid_at?: string | null
          provider?: string | null
          provider_reference?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "withdrawal_requests_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawal_requests_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compose_price: {
        Args: {
          p_currency: string
          p_partner_id: string
          p_provider_base: number
          p_vertical: Database["public"]["Enums"]["travel_vertical"]
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      wallet_credit: {
        Args: {
          p_amount: number
          p_booking_id?: string
          p_category: string
          p_currency: string
          p_description?: string
          p_metadata?: Json
          p_provider?: string
          p_provider_reference?: string
          p_reference: string
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          booking_id: string | null
          category: string
          created_at: string
          currency: string
          description: string | null
          direction: string
          id: string
          metadata: Json
          provider: string | null
          provider_reference: string | null
          reference: string
          status: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      wallet_debit: {
        Args: {
          p_amount: number
          p_booking_id?: string
          p_category: string
          p_currency: string
          p_description?: string
          p_metadata?: Json
          p_provider?: string
          p_provider_reference?: string
          p_reference: string
          p_user_id: string
        }
        Returns: {
          amount: number
          balance_after: number
          booking_id: string | null
          category: string
          created_at: string
          currency: string
          description: string | null
          direction: string
          id: string
          metadata: Json
          provider: string | null
          provider_reference: string | null
          reference: string
          status: string
          user_id: string
          wallet_id: string
        }
        SetofOptions: {
          from: "*"
          to: "wallet_transactions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
      kyc_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
      markup_owner_type: "travsify" | "partner"
      markup_value_type: "fixed" | "percentage"
      travel_vertical:
        | "flights"
        | "hotels"
        | "transfers"
        | "tours"
        | "visas"
        | "insurance"
      visa_application_status:
        | "draft"
        | "submitted"
        | "documents_pending"
        | "documents_verified"
        | "sent_to_embassy"
        | "approved"
        | "rejected"
        | "delivered"
        | "refunded"
        | "cancelled"
      visa_document_status: "pending_review" | "approved" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      kyc_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
      markup_owner_type: ["travsify", "partner"],
      markup_value_type: ["fixed", "percentage"],
      travel_vertical: [
        "flights",
        "hotels",
        "transfers",
        "tours",
        "visas",
        "insurance",
      ],
      visa_application_status: [
        "draft",
        "submitted",
        "documents_pending",
        "documents_verified",
        "sent_to_embassy",
        "approved",
        "rejected",
        "delivered",
        "refunded",
        "cancelled",
      ],
      visa_document_status: ["pending_review", "approved", "rejected"],
    },
  },
} as const
