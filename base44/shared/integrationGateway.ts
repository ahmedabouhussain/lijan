/**
 * LIJAN Integration Gateway — OpenAPI contract for external rendering gateway.
 *
 * The LIJAN Integration Gateway is a deployable service that handles operations
 * exceeding Base44 function runtime limits (5 min) or requiring server-side
 * libraries (Chromium, LibreOffice, PDF/A, advanced Arabic fonts).
 *
 * Deployment Options:
 *   - Cloud-hosted (Azure/AWS)
 *   - Qatar-hosted (sovereign)
 *   - On-Premise
 *
 * The gateway is NOT deployed yet. This contract defines the interface.
 * Base44 native renderer handles what it can; gateway is used for the rest.
 *
 * Status: ENGINEERING COMPLETE — contract defined, awaiting deployment.
 */

export type GatewayEndpoint =
  | '/render'
  | '/convert/pdfa'
  | '/ocr'
  | '/malware/scan'
  | '/signature'
  | '/webhooks/microsoft'
  | '/webhooks/zoom'
  | '/health';

export interface GatewayConfig {
  baseUrl?: string;
  apiKey?: string;
  timeout: number; // seconds
}

export interface RenderRequest {
  format: 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'pdfa' | 'svg';
  sections: any[];
  metadata: any;
  lang: 'ar' | 'en';
  template_id?: string;
  branding?: {
    primary_color?: string;
    logo_url?: string;
    organization_name?: string;
  };
}

export interface RenderResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  file_url?: string;
  error?: string;
  renderer_used?: string;
  duration_ms?: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'down';
  version: string;
  uptime_seconds: number;
  services: {
    chromium: boolean;
    libreoffice: boolean;
    pdfa: boolean;
    arabic_fonts: boolean;
  };
}

/**
 * Gateway client — calls the external LIJAN Integration Gateway.
 * When not configured, falls back to Base44 native renderer.
 */
export class IntegrationGatewayClient {
  constructor(private config: GatewayConfig = { timeout: 300 }) {}

  get isConfigured(): boolean {
    return !!this.config.baseUrl;
  }

  /**
   * Check gateway health.
   */
  async checkHealth(): Promise<HealthResponse | null> {
    if (!this.isConfigured) return null;

    try {
      const response = await fetch(`${this.config.baseUrl}/health`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {},
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  /**
   * Submit a render job to the gateway.
   * Returns job_id — poll for completion (gateway handles long-running tasks).
   */
  async submitRender(request: RenderRequest): Promise<RenderResponse> {
    if (!this.isConfigured) {
      return {
        job_id: '',
        status: 'failed',
        error: 'Gateway not configured — using Base44 native renderer',
      };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/render`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout * 1000),
      });

      if (!response.ok) {
        return { job_id: '', status: 'failed', error: `Gateway error: ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return { job_id: '', status: 'failed', error: error.message };
    }
  }

  /**
   * Poll a render job for completion.
   */
  async getJobStatus(jobId: string): Promise<RenderResponse> {
    if (!this.isConfigured) {
      return { job_id: jobId, status: 'failed', error: 'Gateway not configured' };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/render/${jobId}`, {
        headers: this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {},
      });

      if (!response.ok) {
        return { job_id: jobId, status: 'failed', error: `Gateway error: ${response.status}` };
      }

      return await response.json();
    } catch (error) {
      return { job_id: jobId, status: 'failed', error: error.message };
    }
  }

  /**
   * Submit OCR job to gateway.
   */
  async submitOCR(fileUrl: string, provider?: string): Promise<{ job_id: string; status: string }> {
    if (!this.isConfigured) {
      return { job_id: '', status: 'failed' };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        body: JSON.stringify({ file_url: fileUrl, provider }),
      });

      if (!response.ok) return { job_id: '', status: 'failed' };
      return await response.json();
    } catch (error) {
      return { job_id: '', status: 'failed' };
    }
  }

  /**
   * Submit malware scan to gateway.
   */
  async submitMalwareScan(fileUrl: string, fileHash: string): Promise<{ scan_id: string; status: string }> {
    if (!this.isConfigured) {
      return { scan_id: '', status: 'scan_unavailable' };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/malware/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        body: JSON.stringify({ file_url: fileUrl, file_hash: fileHash }),
      });

      if (!response.ok) return { scan_id: '', status: 'failed' };
      return await response.json();
    } catch (error) {
      return { scan_id: '', status: 'failed' };
    }
  }

  /**
   * Submit signature request to gateway (for QES via TSP).
   */
  async submitSignatureRequest(params: {
    record_hash: string;
    signer_email: string;
    provider: string;
  }): Promise<{ session_id: string; status: string; signing_url?: string }> {
    if (!this.isConfigured) {
      return { session_id: '', status: 'failed' };
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/signature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.config.apiKey ? { 'X-API-Key': this.config.apiKey } : {}),
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) return { session_id: '', status: 'failed' };
      return await response.json();
    } catch (error) {
      return { session_id: '', status: 'failed' };
    }
  }
}

/**
 * Default gateway client (not configured — uses Base44 native fallbacks).
 */
export const defaultGateway = new IntegrationGatewayClient();

/**
 * Gateway webhook endpoints (for receiving callbacks from external services).
 * These are Base44 backend function HTTP endpoints:
 *   - https://lijan.base44.app/functions/HandleMicrosoftWebhook
 *   - https://lijan.base44.app/functions/HandleZoomWebhook
 *
 * Status: ENGINEERING COMPLETE — endpoints defined, awaiting gateway deployment
 * and provider webhook subscription configuration.
 */
export const GATEWAY_WEBHOOK_PATHS = {
  microsoft: '/functions/HandleMicrosoftWebhook',
  zoom: '/functions/HandleZoomWebhook',
  gateway_callback: '/functions/HandleGatewayCallback',
};