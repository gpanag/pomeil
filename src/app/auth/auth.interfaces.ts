export interface StrapiUser {
  id: number;
  username: string;
  email: string;
  blocked: boolean;
  confirmed: boolean;
}

export interface StrapiAuthResponse {
  jwt: string;
  user: StrapiUser;
}
