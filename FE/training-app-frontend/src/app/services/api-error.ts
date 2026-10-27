import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: HttpErrorResponse): string {
  if (error.status === 0) return 'Cannot reach the server. Check your connection and localhost HTTPS certificates.';
  const body = error.error;
  if (body?.errors && typeof body.errors === 'object') {
    return Object.values(body.errors as Record<string, string[]>).flat().join(' ');
  }
  return body?.detail || body?.title || body?.message || 'The request failed. Please try again.';
}
