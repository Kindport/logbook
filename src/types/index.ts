export interface User {
  id: string | number;
  name: string;
  email: string;
  matric_no: string;
  institution: string;
  department: string;
}

export interface Placement {
  id: string | number;
  user_id?: string | number;
  host_organization: string;
  start_date: string;
  duration_weeks: number;
}

export interface EntryDay {
  id?: string | number;
  entry_id?: string | number;
  day_name: string;
  text: string;
}

export interface Entry {
  id: string | number;
  user_id?: string | number;
  week_number: number;
  date_range: string;
  raw_notes: string;
  summary: string;
  created_at: string;
  updated_at: string;
  days: EntryDay[];
}

export interface AuthState {
  token: string | null;
  user: User | null;
  placement: Placement | null;
  isLoading: boolean;
}
