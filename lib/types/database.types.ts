// =========================================================
// Database Types - Sistema de Votación Digital
// =========================================================

export type UserRole = 'voter' | 'admin' | 'delegate';

export interface Profile {
  id: string;
  document: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Election {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface VotingPoint {
  id: string;
  election_id: string;
  name: string;
  location: string | null;
  delegate_id: string | null;
  created_at: string;
  updated_at: string;
  // Relations
  delegate?: Profile;
  election?: Election;
}

export interface Slate {
  id: string;
  voting_point_id: string;
  name: string;
  description: string | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
  // Relations
  voting_point?: VotingPoint;
  members?: SlateMember[];
}

export interface SlateMember {
  id: string;
  slate_id: string;
  full_name: string;
  role: string | null;
  created_at: string;
}

export interface Voter {
  id: string;
  profile_id: string;
  voting_point_id: string;
  has_voted: boolean;
  voted_at: string | null;
  created_at: string;
  // Relations
  profile?: Profile;
  voting_point?: VotingPoint;
}

export interface Vote {
  id: string;
  voter_id: string;
  slate_id: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  ip_address: string | null;
  created_at: string;
}

// =========================================================
// Form Types
// =========================================================

export interface ElectionFormData {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
}

export interface VotingPointFormData {
  name: string;
  location?: string;
  delegate_id?: string;
}

export interface SlateFormData {
  name: string;
  description?: string;
}

export interface SlateMemberFormData {
  full_name: string;
  role?: string;
}

// =========================================================
// API Response Types
// =========================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// =========================================================
// Extended Types with Relations
// =========================================================

export interface ElectionWithDetails extends Election {
  voting_points?: VotingPointWithDetails[];
  total_voters?: number;
  total_votes?: number;
}

export interface VotingPointWithDetails extends VotingPoint {
  slates?: SlateWithDetails[];
  delegate?: Profile;
  total_voters?: number;
  total_votes?: number;
}

export interface SlateWithDetails extends Slate {
  members?: SlateMember[];
  voting_point?: VotingPoint;
}
