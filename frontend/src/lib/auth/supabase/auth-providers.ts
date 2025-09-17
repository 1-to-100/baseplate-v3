export interface OAuthProvider {
  id: 'google' | 'linkedin_oidc' | 'azure';
  name: string;
  logo: string;
}

export const oAuthProviders = [
  { id: 'google', name: 'Google', logo: '/assets/logo-google.svg' },
  { id: 'azure', name: 'Microsoft', logo: '/assets/logo-microsoft.svg' },
  { id: 'linkedin_oidc', name: 'Linked', logo: '/assets/logo-linkedin.svg' },
] satisfies OAuthProvider[];