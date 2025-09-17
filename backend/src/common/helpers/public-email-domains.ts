export const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.fr',
  'yahoo.co.jp',
  'hotmail.com',
  'hotmail.co.uk',
  'hotmail.fr',
  'outlook.com',
  'outlook.co.uk',
  'outlook.fr',
  'live.com',
  'msn.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'aol.com',
  'protonmail.com',
  'proton.me',
  'yandex.com',
  'yandex.ru',
  'mail.ru',
  'zoho.com',
  'gmx.com',
  'gmx.net',
  'mail.com',
  'inbox.com',
  'fastmail.com',
  'fastmail.fm',
  'tutanota.com',
  'tutanota.de',
  'titan.email',
  // add other public email domains here
]);

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase().trim());
}
