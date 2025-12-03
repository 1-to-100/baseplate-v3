export interface User {
  id: string;
  name?: string;
  avatar?: string;
  email?: string;
  firstName?: string;
  lastName?: string;

  [key: string]: unknown;
}
