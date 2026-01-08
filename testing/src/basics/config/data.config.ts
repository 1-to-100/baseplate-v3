import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export class ConfigData {
  public static baseUrl = process.env.BASE_URL;
  public static loginPage = this.baseUrl + '/auth/supabase/sign-in';
  public static registerPage = this.baseUrl + '/auth/supabase/sign-up';
  public static mailGenerator = process.env.MAIL_GENERATOR;
  public static supabaseApiUrl = process.env.SUPABASE_API_URL;
  public static supabaseApiKey = process.env.SUPABASE_API_KEY;

  public static users = {
    admin: {
      user: process.env.ADMIN as string,
      password: process.env.BASE_PASSWORD as string,
    },
    customer: {
      user: process.env.CUSTOMER as string,
      password: process.env.BASE_PASSWORD as string,
    },
    userWithPermissions: {
      user: process.env.USER_WITH_PERMISSIONS as string,
      password: process.env.BASE_PASSWORD as string,
    },
    manager: {
      user: process.env.MANAGER as string,
      password: process.env.BASE_PASSWORD as string,
    },
    standardUser: {
      user: process.env.STANDARD_USER as string,
      password: process.env.BASE_PASSWORD as string,
    },
    userForRoles: {
      user: process.env.USER_FOR_ROLES as string,
      password: process.env.BASE_PASSWORD as string,
    },
  };
}
