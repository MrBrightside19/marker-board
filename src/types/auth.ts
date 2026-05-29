export type UserRole = "organizer" | "spectator";

export interface UserProfile {
  id: string;
  role: UserRole;
  displayName: string;
  createdAt?: string;
}
