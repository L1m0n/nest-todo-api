import { registerAs } from '@nestjs/config';
import * as process from 'node:process';

export interface AuthConfig {
  jwt: {
    secret: string;
    expiresIn: string;
  };
}

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    jwt: {
      secret: process.env.JWT_SECRET as string,
      expiresIn: process.env.JWT_EXPIRES_IN ?? '60m',
    },
  }),
);
