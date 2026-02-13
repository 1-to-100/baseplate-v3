export interface AuthenticatedUser {
  id: string;
  email: string;
  user_id: string;
  customer_id: string | null;
  role: {
    name: string;
    is_system_role: boolean;
  } | null;
}

export interface ApiError {
  message: string;
  statusCode: number;
  code?: string;
}
