/**
 * Chooses the authentication implementation used by the app.
 *
 * This workspace is configured to use the real backend API for authentication.
 */
import { realAuthApi } from './auth';

export const authApi = realAuthApi;
