import { request } from 'https';
import { performance } from 'perf_hooks';

const TIME_API_URLS = [
  'https://timeapi.io/api/Time/current/zone?timeZone=UTC',
  'https://worldtimeapi.org/api/timezone/Etc/UTC',
  'https://www.google.com'
];
const REQUEST_TIMEOUT_MS = 8_000;
const SYNC_RETRIES = 3;

interface TimeApiResponse {
  unixtime?: number;
  datetime?: string;
  currentUtcDateTime?: string;
}

class TimeAuthority {
  private remoteAnchorMs: number | null = null;
  private monotonicAnchorMs: number | null = null;
  private lastTrustedMs = 0;

  async sync(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < SYNC_RETRIES; attempt++) {
      try {
        const remoteMs = await this.fetchRemoteTime();
        this.remoteAnchorMs = remoteMs;
        this.monotonicAnchorMs = performance.now();
        this.lastTrustedMs = remoteMs;
        return;
      } catch (error) {
        lastError = error;
        if (attempt < SYNC_RETRIES - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }
    throw lastError instanceof Error ? lastError : new Error('No se pudo sincronizar la hora confiable.');
  }

  nowMs(): number {
    if (this.remoteAnchorMs === null || this.monotonicAnchorMs === null) {
      throw new Error('La hora confiable no esta sincronizada.');
    }

    const elapsedMs = Math.max(0, performance.now() - this.monotonicAnchorMs);
    const trustedMs = Math.max(this.lastTrustedMs, this.remoteAnchorMs + elapsedMs);
    this.lastTrustedMs = trustedMs;
    return trustedMs;
  }

  now(): Date {
    return new Date(this.nowMs());
  }

  private fetchRemoteTime(): Promise<number> {
    return this.fetchFrom(0);
  }

  private fetchFrom(index: number): Promise<number> {
    if (index >= TIME_API_URLS.length) {
      return Promise.reject(new Error('No se pudo consultar ninguna fuente de hora confiable.'));
    }

    return new Promise((resolve, reject) => {
      const url = TIME_API_URLS[index];
      const requestHandle = request(url, { headers: { Accept: 'application/json' } }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          this.fetchFrom(index + 1).then(resolve, reject);
          return;
        }

        const headerDate = response.headers.date ? Date.parse(response.headers.date) : Number.NaN;
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => { body += chunk; });
        response.on('end', () => {
          try {
            const payload = body ? JSON.parse(body) as TimeApiResponse : {};
            const remoteMs = typeof payload.unixtime === 'number'
              ? payload.unixtime * 1000
              : Date.parse(payload.currentUtcDateTime ?? payload.datetime ?? '');
            const trustedMs = Number.isFinite(remoteMs) ? remoteMs : headerDate;
            if (!Number.isFinite(trustedMs)) throw new Error('Respuesta de hora invalida.');
            resolve(trustedMs);
          } catch {
            if (Number.isFinite(headerDate)) resolve(headerDate);
            else this.fetchFrom(index + 1).then(resolve, reject);
          }
        });
      });

      requestHandle.setTimeout(REQUEST_TIMEOUT_MS, () => {
        requestHandle.destroy(new Error('La API de hora ha agotado el tiempo de espera.'));
      });
      requestHandle.on('error', () => this.fetchFrom(index + 1).then(resolve, reject));
      requestHandle.end();
    });
  }
}

export const timeAuthority = new TimeAuthority();
