// ============================================================
// GovBidly — Core Types
// ============================================================

export interface Contract {
  id: string;
  notice_id: string;
  title: string;
  description: string;
  sol_number: string | null;
  department: string | null;
  sub_tier: string | null;
  office: string | null;
  posted_date: string;
  response_deadline: string | null;
  type: ContractType;
  set_aside: string | null;
  naics_code: string | null;
  naics_description: string | null;
  classification_code: string | null;
  place_of_performance_state: string | null;
  place_of_performance_city: string | null;
  award_amount: number | null;
  point_of_contact_name: string | null;
  point_of_contact_email: string | null;
  link: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export type ContractType =
  | "Solicitation"
  | "Award Notice"
  | "Pre-Solicitation"
  | "Sources Sought"
  | "Special Notice"
  | "Combined Synopsis/Solicitation"
  | "Intent to Bundle"
  | "Sale of Surplus Property"
  | string;

export interface ContractFilters {
  query?: string;
  state?: string;
  naics_code?: string;
  set_aside?: string;
  type?: ContractType;
  min_amount?: number;
  max_amount?: number;
  posted_after?: string;
  deadline_after?: string;
  page?: number;
  per_page?: number;
}

export interface ContractSearchResult {
  contracts: Contract[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// User & Auth
export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  subscription_tier: SubscriptionTier;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  trial_ends_at: string | null;
  searches_today: number;
  max_daily_searches: number;
  created_at: string;
}

export type SubscriptionTier = "free" | "starter" | "pro" | "agency";
export type SubscriptionStatus = "trialing" | "active" | "canceled" | "past_due" | "inactive";

// Saved Searches & Alerts
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  filters: ContractFilters;
  alert_enabled: boolean;
  alert_frequency: "daily" | "weekly";
  last_alerted_at: string | null;
  created_at: string;
}

export interface AlertNotification {
  id: string;
  user_id: string;
  saved_search_id: string;
  contracts: string[]; // contract IDs
  sent_at: string | null;
  read: boolean;
}

// Pricing
export interface PricingTier {
  name: string;
  tier: SubscriptionTier;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  limits: {
    daily_searches: number;
    states: number | "unlimited";
    saved_searches: number;
    alerts: boolean;
    api_access: boolean;
    team_members: number;
  };
  popular?: boolean;
}

// sam.gov API response types
export interface SamGovOpportunity {
  noticeId: string;
  title: string;
  solicitationNumber: string;
  fullParentPathName: string;
  fullParentPathCode: string;
  postedDate: string;
  type: string;
  baseType: string;
  archiveType: string;
  archiveDate: string;
  setAsideDescription: string;
  setAsideCode: string;
  responseDeadLine: string;
  naicsCode: string;
  naicsSolicitationDescription?: string;
  classificationCode: string;
  active: string;
  description: string;
  organizationType: string;
  officeAddress: {
    city: string;
    state: string;
    zipcode: string;
    countryCode: string;
  };
  placeOfPerformance: {
    city: { code: string; name: string };
    state: { code: string; name: string };
    country: { code: string; name: string };
  };
  pointOfContact: Array<{
    fullName: string;
    email: string;
    phone: string;
    type: string;
  }>;
  award?: {
    amount: string;
  };
  link: {
    href: string;
  };
}

export interface SamGovResponse {
  totalRecords: number;
  limit: number;
  offset: number;
  opportunitiesData: SamGovOpportunity[];
}
