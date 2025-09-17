export function getDomainFromEmail(email: string): string {
  if (!email) return '';

  const trimmed = email.trim().toLowerCase();
  const domainRegex = /@([^@\s]+)$/;
  const match = domainRegex.exec(trimmed);
  return match ? match[1] : '';
}
