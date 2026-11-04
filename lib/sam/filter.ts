export function sanitizePII(text: string): string {
  return text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL REDACTED]').replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE REDACTED]').replace(/\b\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '[PHONE REDACTED]');
}

export function containsSecret(text: string): boolean {
  const patterns = [
    /ADMIN_SESSION_SECRET/i,
    /API_KEYS/i,
    /OPENROUTER_API_KEY/i,
    /CHATGPT_API_KEY/i,
    /\.env\.local/i,
    /password/i,
  ];
  return patterns.some((p) => p.test(text));
}

export function maskMessage(message: string): string {
  let masked = sanitizePII(message);
  masked = masked.replace(/(Bearer\s+)[A-Za-z0-9_-]+/g, '$1[REDACTED]');
  masked = masked.replace(/(sk-[A-Za-z0-9]{20,})/g, '[API KEY REDACTED]');
  return masked;
}
