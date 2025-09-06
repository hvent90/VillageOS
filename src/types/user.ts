export interface UserContext {
  id: string;
  phoneNumber: string;
  displayName?: string;
  baselineUrl?: string;
}

export interface CreateUserRequest {
  phoneNumber: string;
  displayName?: string;
}

export interface UpdateUserBaselineRequest {
  userId: string;
  baselineUrl: string;
}