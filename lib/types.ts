export type Tier = "basic" | "plus" | "pro" | "super_user";
export type Role = "user" | "admin";

export type Profile = {
  id: string;
  email: string | null;
  github_login: string | null;
  tier: Tier;
  role: Role;
  disabled: boolean;
  created_at: string;
  updated_at: string;
};

export type Endpoint = {
  id: string;
  user_id: string | null;
  anonymous_session_hash: string | null;
  receiver_token: string;
  name: string;
  tier: Tier;
  request_limit: number;
  body_size_limit: number;
  request_count: number;
  expires_at: string;
  history_expires_at: string;
  created_at: string;
};

export type Delivery = {
  id: string;
  endpoint_id: string;
  method: string;
  path: string;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  body: string;
  parsed_json: unknown | null;
  content_type: string | null;
  body_size: number;
  received_at: string;
};
