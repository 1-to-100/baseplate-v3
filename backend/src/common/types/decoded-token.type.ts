export interface DecodedIdToken {
  /**
   * The audience for which this token is intended.
   */
  aud: string;
  /**
   * Time, in seconds since the Unix epoch, when the end-user authentication
   * occurred.
   */
  auth_time?: number;
  /**
   * The email of the user to whom the ID token belongs, if available.
   */
  email?: string;
  /**
   * Whether or not the email of the user to whom the ID token belongs is
   * verified, provided the user has an email.
   */
  email_verified?: boolean;
  /**
   * The ID token's expiration time, in seconds since the Unix epoch.
   */
  exp: number;
  /**
   * The ID token's issued-at time, in seconds since the Unix epoch.
   */
  iat: number;
  /**
   * The issuer identifier for the issuer of the response.
   */
  iss: string;
  /**
   * The phone number of the user to whom the ID token belongs, if available.
   */
  phone_number?: string;
  /**
   * The photo URL for the user to whom the ID token belongs, if available.
   */
  picture?: string;
  /**
   * The `uid` corresponding to the user who the ID token belonged to.
   */
  sub: string;
  /**
   * The `uid` corresponding to the user who the ID token belonged to.
   */
  uid: string;
  /**
   * Other arbitrary claims included in the ID token.
   */
  [key: string]: any;
}
/** @alpha */
export interface DecodedAuthBlockingSharedUserInfo {
  uid: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  phone_number?: string;
}
/** @alpha */
export interface DecodedAuthBlockingMetadata {
  creation_time?: number;
  last_sign_in_time?: number;
}
/** @alpha */
export interface DecodedAuthBlockingUserInfo
  extends DecodedAuthBlockingSharedUserInfo {
  provider_id: string;
}
/** @alpha */
export interface DecodedAuthBlockingMfaInfo {
  uid: string;
  display_name?: string;
  phone_number?: string;
  enrollment_time?: string;
  factor_id?: string;
}
/** @alpha */
export interface DecodedAuthBlockingEnrolledFactors {
  enrolled_factors?: DecodedAuthBlockingMfaInfo[];
}
/** @alpha */
export interface DecodedAuthBlockingUserRecord
  extends DecodedAuthBlockingSharedUserInfo {
  email_verified?: boolean;
  disabled?: boolean;
  metadata?: DecodedAuthBlockingMetadata;
  password_hash?: string;
  password_salt?: string;
  provider_data?: DecodedAuthBlockingUserInfo[];
  multi_factor?: DecodedAuthBlockingEnrolledFactors;
  custom_claims?: any;
  tokens_valid_after_time?: number;
  tenant_id?: string;
  [key: string]: any;
}
/** @alpha */
export interface DecodedAuthBlockingToken {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  event_id: string;
  event_type: string;
  ip_address: string;
  user_agent?: string;
  locale?: string;
  sign_in_method?: string;
  user_record?: DecodedAuthBlockingUserRecord;
  tenant_id?: string;
  raw_user_info?: string;
  sign_in_attributes?: {
    [key: string]: any;
  };
  oauth_id_token?: string;
  oauth_access_token?: string;
  oauth_refresh_token?: string;
  oauth_token_secret?: string;
  oauth_expires_in?: number;
  [key: string]: any;
}
