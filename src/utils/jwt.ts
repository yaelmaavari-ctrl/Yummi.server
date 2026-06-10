import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';
import { JwtPayload, UserRole } from '../types';

/**
 * Signs a JWT containing the user id and the role active for this session.
 * Authorization throughout the app is based on `activeRole`.
 */
export function signToken(userId: string, activeRole: UserRole): string {
  const payload: JwtPayload = { userId, activeRole };
  const options: SignOptions = { expiresIn: env.jwt.expiresIn as SignOptions['expiresIn'] };
  return jwt.sign(payload, env.jwt.secret, options);
}

/**
 * Verifies and decodes a JWT, returning its payload.
 * Throws if the token is invalid or expired.
 */
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.jwt.secret) as JwtPayload;
}
