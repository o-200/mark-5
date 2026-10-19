import crypto from 'node:crypto';

export class HmacSigner {
  /**
   * Generates the current UNIX timestamp in seconds.
   */
  public static generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  /**
   * Computes HMAC-SHA256 hex signature over:
   * `${timestamp}\n${method.toUpperCase()}\n${fullpath}`
   */
  public static sign(
    secretKey: string,
    timestamp: string,
    method: string,
    fullpath: string
  ): string {
    const normalizedMethod = method.toUpperCase();
    const payload = `${timestamp}\n${normalizedMethod}\n${fullpath}`;
    return crypto.createHmac('sha256', secretKey).update(payload).digest('hex');
  }

  /**
   * Generates the required authentication headers for the backend API.
   */
  public static createAuthHeaders(
    secretKey: string,
    method: string,
    fullpath: string,
    customTimestamp?: string
  ): { 'X-Timestamp': string; 'X-Signature': string; Accept: string } {
    const timestamp = customTimestamp ?? this.generateTimestamp();
    const signature = this.sign(secretKey, timestamp, method, fullpath);

    return {
      'X-Timestamp': timestamp,
      'X-Signature': signature,
      Accept: 'text/plain',
    };
  }
}
