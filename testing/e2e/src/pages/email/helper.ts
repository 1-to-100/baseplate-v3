import type { APIRequestContext } from '@playwright/test';
import { request } from '@playwright/test';
import { ConfigData } from '@configData';
import { EmailRoutes } from '@pages/email/routes';
import { appData } from '@constants/text.constants';
import { ApiMethods } from '../api/methods';

export class EmailHelper {
  private requestContext: APIRequestContext;
  public token: string = '';
  public email: string = '';

  constructor(requestContext: APIRequestContext) {
    this.requestContext = requestContext;
  }

  private async createContext(headers?: Record<string, string>): Promise<void> {
    this.requestContext = await request.newContext({
      baseURL: ConfigData.mailGenerator,
      extraHTTPHeaders: headers,
    });
  }

  private static defaultPassword = 'Test12345!';

  async generateNewEmail(): Promise<string> {
    await this.createContext();
    const domain = await this.getAvailableDomain();
    this.email = `test_${Date.now()}@${domain}`;
    await this.createAccount(this.email, EmailHelper.defaultPassword);
    this.token = await this.fetchAccessToken(this.email, EmailHelper.defaultPassword);
    await this.createContext(ApiMethods.headerWithBearerToken(this.token).headers);
    return this.email;
  }

  private async getAvailableDomain(): Promise<string> {
    const response = await this.requestContext.get(EmailRoutes.domains);
    const data = await response.json();
    return data['hydra:member'][0].domain;
  }

  private async createAccount(email: string, password: string): Promise<void> {
    await this.requestContext.post(EmailRoutes.accounts, {
      data: { address: email, password },
    });
  }

  private async fetchAccessToken(email: string, password: string): Promise<string> {
    const response = await this.requestContext.post(EmailRoutes.token, {
      data: { address: email, password },
    });
    const { token } = await response.json();
    return token;
  }

  async waitForEmail(subjectPart: string): Promise<any> {
    for (let i = 0; i < 10; i++) {
      const res = await this.requestContext.get(EmailRoutes.messages);
      const response = await res.json();
      const messages = response['hydra:member'];
      if (messages && messages.length > 0) {
        const matched = messages.find((msg: any) => msg.subject.includes(subjectPart));
        if (matched) {
          const fullRes = await this.requestContext.get(EmailRoutes.messages + `/${matched.id}`);
          return fullRes.json();
        }
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
  }

  async extractRegistrationLink(emailBody: string): Promise<string | null> {
    const bracketUrlRegex = /\[(https?:\/\/[^\]]+)\]/g;
    const bracketMatches = emailBody.match(bracketUrlRegex);
    if (bracketMatches && bracketMatches.length > 0) {
      return bracketMatches[0].replace(/^\[|\]$/g, '');
    }
    const urlRegex = /(https?:\/\/[^\s)\]]+)/g;
    const matches = emailBody.match(urlRegex);
    if (matches && matches.length > 0) {
      return matches[0];
    }
    return null;
  }

  async verifyInvitationEmail(email: string, token: string): Promise<boolean> {
    this.email = email;
    this.token = token;
    await this.createContext(ApiMethods.headerWithBearerToken(token).headers);
    const emailContent = await this.waitForEmail(appData.emailSubject.invitation);
    return !!emailContent;
  }
}
