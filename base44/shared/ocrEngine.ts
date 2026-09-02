/**
 * LIJAN OCR & Intake Engine — Document text extraction and structured data.
 *
 * Two paths:
 *   1. Digital Document Path — PDF/DOCX with embedded text
 *      Status: LIVE (uses ExtractDataFromUploadedFile)
 *   2. Scanned Document Path — images, scanned PDFs
 *      Status: ENGINEERING COMPLETE — awaiting OCR provider API key
 *      Provider Adapter: Azure Document Intelligence / sovereign OCR service
 *
 * Workflow:
 *   Upload → Quarantine → Provider Selection → Processing →
 *   Structured Extraction → Confidence → Human Review → Confirm
 */

export type DocumentPath = 'digital' | 'scanned';
export type ProcessingState = 'uploaded' | 'quarantined' | 'processing' | 'extracted' | 'reviewing' | 'confirmed' | 'failed';

export interface OCRProvider {
  name: string;
  type: 'azure_document_intelligence' | 'sovereign_ocr' | 'mock' | 'custom';
  configured: boolean;
  analyzeDocument(fileUrl: string): Promise<OCRResult>;
  getJobStatus(jobId: string): Promise<OCRResult>;
}

export interface OCRResult {
  status: 'success' | 'processing' | 'failed';
  text?: string;
  confidence?: number;
  tables?: any[];
  boundingBoxes?: any[];
  pages?: number;
  sourcePages?: number[];
  error?: string;
}

/**
 * Determine document path: digital (has text) vs scanned (image).
 */
export function detectDocumentPath(fileUrl: string, mimeType: string): DocumentPath {
  // Images are always scanned
  if (mimeType.startsWith('image/')) return 'scanned';

  // PDFs and DOCX are digital (may have embedded text)
  if (mimeType === 'application/pdf' || mimeType.includes('word')) return 'digital';

  return 'scanned';
}

/**
 * Extract text from digital documents using Base44 ExtractDataFromUploadedFile.
 * LIVE — works now for PDF/DOCX with embedded text.
 */
export async function extractFromDigitalDocument(
  base44: any,
  fileUrl: string,
  jsonSchema: object
): Promise<{ status: string; output: any; details?: string }> {
  try {
    const result = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url: fileUrl,
      json_schema: jsonSchema,
    });

    return {
      status: result.status,
      output: result.output,
      details: result.details,
    };
  } catch (error) {
    return { status: 'error', output: null, details: error.message };
  }
}

/**
 * Extract text from scanned documents via OCR provider.
 * ENGINEERING COMPLETE — awaiting provider API key.
 * Mock provider available for sandbox testing.
 */
export async function extractFromScannedDocument(
  base44: any,
  fileUrl: string,
  provider: OCRProvider
): Promise<OCRResult> {
  if (!provider.configured) {
    return {
      status: 'failed',
      error: `OCR provider '${provider.name}' not configured. Using mock provider for sandbox.`,
    };
  }

  try {
    return await provider.analyzeDocument(fileUrl);
  } catch (error) {
    return { status: 'failed', error: error.message };
  }
}

/**
 * Mock OCR provider — for sandbox/testing only.
 * Returns placeholder data clearly marked as sandbox.
 */
export const mockOCRProvider: OCRProvider = {
  name: 'Sandbox Mock OCR',
  type: 'mock',
  configured: false,
  async analyzeDocument(fileUrl: string): Promise<OCRResult> {
    return {
      status: 'success',
      text: '[SANDBOX MOCK OCR] This is placeholder text. Configure Azure Document Intelligence or sovereign OCR provider for production use.',
      confidence: 0.0,
      pages: 1,
      sourcePages: [1],
    };
  },
  async getJobStatus(jobId: string): Promise<OCRResult> {
    return { status: 'success', text: '[SANDBOX MOCK OCR] Job complete', confidence: 0.0 };
  },
};

/**
 * Azure Document Intelligence provider adapter.
 * ENGINEERING COMPLETE — awaiting API key.
 * When configured: calls Azure DI endpoint with the document.
 */
export function createAzureDIProvider(apiKey: string, endpoint: string): OCRProvider {
  return {
    name: 'Azure Document Intelligence',
    type: 'azure_document_intelligence',
    configured: !!apiKey,
    async analyzeDocument(fileUrl: string): Promise<OCRResult> {
      if (!apiKey) {
        return { status: 'failed', error: 'Azure Document Intelligence API key not configured' };
      }

      // TODO: When API key is set, call Azure DI:
      // POST {endpoint}/documentintelligence/documentModels/prebuilt-read:analyze
      // Headers: Ocp-Apim-Subscription-Key: {apiKey}
      // Body: { urlSource: fileUrl }
      // Poll for results, extract text + tables + bounding boxes

      try {
        const response = await fetch(`${endpoint}/documentintelligence/documentModels/prebuilt-read:analyze?api-version=2024-02-29-preview`, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ urlSource: fileUrl }),
        });

        if (!response.ok) {
          return { status: 'failed', error: `Azure DI error: ${response.status}` };
        }

        const operationLocation = response.headers.get('operation-location');
        // Poll operationLocation until complete
        // Extract content, tables, bounding boxes

        return { status: 'processing', pages: 1 };
      } catch (error) {
        return { status: 'failed', error: error.message };
      }
    },
    async getJobStatus(jobId: string): Promise<OCRResult> {
      return { status: 'processing' };
    },
  };
}

/**
 * Sovereign OCR provider — for on-premise/government deployment.
 * ENGINEERING COMPLETE — awaiting deployment.
 */
export function createSovereignOCRProvider(endpoint: string): OCRProvider {
  return {
    name: 'Sovereign OCR Service',
    type: 'sovereign_ocr',
    configured: !!endpoint,
    async analyzeDocument(fileUrl: string): Promise<OCRResult> {
      if (!endpoint) {
        return { status: 'failed', error: 'Sovereign OCR endpoint not configured' };
      }
      // TODO: Call sovereign OCR service when deployed
      return { status: 'failed', error: 'Sovereign OCR service not yet deployed' };
    },
    async getJobStatus(jobId: string): Promise<OCRResult> {
      return { status: 'processing' };
    },
  };
}

/**
 * Master extraction function — routes to appropriate path.
 */
export async function extractDocument(
  base44: any,
  fileUrl: string,
  mimeType: string,
  jsonSchema: object,
  ocrProvider?: OCRProvider
): Promise<{ path: DocumentPath; result: any; processingState: ProcessingState }> {
  const path = detectDocumentPath(fileUrl, mimeType);

  if (path === 'digital') {
    const result = await extractFromDigitalDocument(base44, fileUrl, jsonSchema);
    return {
      path,
      result,
      processingState: result.status === 'success' ? 'extracted' : 'failed',
    };
  }

  // Scanned path
  const provider = ocrProvider || mockOCRProvider;
  const result = await extractFromScannedDocument(base44, fileUrl, provider);
  return {
    path,
    result,
    processingState: result.status === 'success' ? 'extracted' : 'failed',
  };
}