/**
 * TypeScript types for the Supabase database, matching the SQL files in
 * supabase/migrations (initial schema, report evidence, moderation).
 *
 * Written in the same shape as `supabase gen types typescript`. Once your
 * project is set up you can regenerate this file with:
 *   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export const CHECK_TYPES = ['url', 'qr', 'token', 'scheme'] as const;
export const RISK_LEVELS = ['none', 'low', 'medium', 'high'] as const;
export const REPORT_STATUSES = ['pending', 'approved', 'rejected'] as const;
export const SCHEME_TYPES = [
  'investment_ponzi',
  'fake_exchange',
  'giveaway_airdrop',
  'romance',
  'impersonation',
  'phishing',
  'pump_and_dump',
  'job_task',
  'other',
] as const;
export const PLATFORMS = [
  'facebook',
  'whatsapp',
  'telegram',
  'tiktok',
  'instagram',
  'website',
  'sms',
  'phone_call',
  'in_person',
  'other',
] as const;

export type CheckType = (typeof CHECK_TYPES)[number];
export type DbRiskLevel = (typeof RISK_LEVELS)[number];
export type ReportStatus = (typeof REPORT_STATUSES)[number];
export type SchemeType = (typeof SCHEME_TYPES)[number];
export type Platform = (typeof PLATFORMS)[number];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          created_at: string;
          updated_at: string;
        };
        // Rows are created by the sign-up trigger, never by the app.
        Insert: never;
        // Only display_name is updatable by users (column privileges).
        Update: {
          display_name?: string;
        };
        Relationships: [];
      };
      checks: {
        Row: {
          id: string;
          user_id: string;
          input: string;
          type: CheckType;
          score: number;
          risk_level: DbRiskLevel;
          signals: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          input: string;
          type: CheckType;
          score: number;
          risk_level: DbRiskLevel;
          signals?: Json;
          created_at?: string;
        };
        // Checks cannot be edited after saving.
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'checks_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      reports: {
        Row: {
          id: string;
          user_id: string;
          scheme_type: SchemeType;
          platform: Platform;
          description: string;
          latitude: number | null;
          longitude: number | null;
          status: ReportStatus;
          created_at: string;
          updated_at: string;
          /** Set by moderate_report(); cleared when the report is edited. */
          reviewed_at: string | null;
          reviewed_by: string | null;
          /** Optional note from the moderator to the reporter. */
          review_note: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          scheme_type: SchemeType;
          platform: Platform;
          description: string;
          latitude?: number | null;
          longitude?: number | null;
          // Must be 'pending' (enforced by RLS); leave it out.
          status?: 'pending';
        };
        // Users may only update these columns (column privileges).
        Update: {
          scheme_type?: SchemeType;
          platform?: Platform;
          description?: string;
          latitude?: number | null;
          longitude?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      evidence: {
        Row: {
          id: string;
          report_id: string;
          storage_path: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          report_id: string;
          storage_path: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'evidence_report_id_fkey';
            columns: ['report_id'];
            isOneToOne: false;
            referencedRelation: 'reports';
            referencedColumns: ['id'];
          },
        ];
      };
      moderators: {
        // Not readable or writable through the API; use is_moderator().
        Row: { user_id: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_moderator: { Args: never; Returns: boolean };
      moderate_report: {
        Args: { report_id: string; decision: 'approved' | 'rejected'; note?: string | null };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database['public']['Tables'];
export type Tables<T extends keyof PublicTables> = PublicTables[T]['Row'];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]['Insert'];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]['Update'];

export type Profile = Tables<'profiles'>;
export type CheckRow = Tables<'checks'>;
export type ReportRow = Tables<'reports'>;
export type EvidenceRow = Tables<'evidence'>;
