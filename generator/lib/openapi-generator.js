/**
 * Phase 22 — OpenAPI 3.1 Specification Generator
 *
 * Derives a complete, valid OpenAPI spec from existing tool definitions.
 * Output: /openapi.json (static file)
 *
 * Each tool becomes:
 *   POST /api/v1/convert/{toolSlug}
 */

const MIME_EXT_MAP = {
  'image/jpeg':        'jpg',
  'image/png':         'png',
  'image/webp':        'webp',
  'image/avif':        'avif',
  'image/gif':         'gif',
  'image/svg+xml':     'svg',
  'image/tiff':        'tiff',
  'image/bmp':         'bmp',
  'image/heic':        'heic',
  'image/heif':        'heif',
  'application/pdf':   'pdf',
  'text/plain':        'txt',
  'text/csv':          'csv',
  'text/markdown':     'md',
  'application/json':  'json',
  'application/xml':   'xml',
  'application/zip':   'zip',
  'audio/mpeg':        'mp3',
  'audio/wav':         'wav',
  'video/mp4':         'mp4',
};

function mimeToExt(mime) {
  return MIME_EXT_MAP[mime] || mime.split('/').pop().split('+')[0];
}

function toolToOperationId(slug) {
  return slug.replace(/-/g, '_');
}

// ── Shared schemas ─────────────────────────────────────────────────────────

const COMMON_SCHEMAS = {
  ApiError: {
    type: 'object',
    required: ['ok', 'error'],
    properties: {
      ok:        { type: 'boolean', example: false },
      error:     { type: 'string', example: 'quota_exceeded', description: 'Machine-readable error code' },
      message:   { type: 'string', example: 'Daily conversion limit reached' },
      status:    { type: 'integer', example: 429 },
      requestId: { type: 'string', example: 'req_abc123', nullable: true },
      meta: {
        type: 'object',
        properties: {
          version:     { type: 'string', example: 'v1' },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  ConversionJob: {
    type: 'object',
    required: ['ok', 'data'],
    properties: {
      ok: { type: 'boolean', example: true },
      data: {
        type: 'object',
        required: ['jobId', 'status'],
        properties: {
          jobId:        { type: 'string', example: 'job_1718000000_ab3f2c' },
          status:       { type: 'string', enum: ['queued', 'uploading', 'processing', 'completed', 'failed'], example: 'completed' },
          outputFormat: { type: 'string', example: 'image/png' },
          downloadUrl:  { type: 'string', format: 'uri', nullable: true, example: 'https://dropanyconvert.com/api/v1/jobs/job_1718000000_ab3f2c/download' },
          expiresAt:    { type: 'string', format: 'date-time', nullable: true },
          sizeBytes:    { type: 'integer', nullable: true, example: 204800 },
          durationMs:   { type: 'integer', nullable: true, example: 320 },
        },
      },
      meta: {
        type: 'object',
        properties: {
          version:     { type: 'string', example: 'v1' },
          generatedAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  },

  JobStatus: {
    type: 'object',
    required: ['ok', 'data'],
    properties: {
      ok: { type: 'boolean', example: true },
      data: {
        type: 'object',
        properties: {
          jobId:        { type: 'string' },
          status:       { type: 'string', enum: ['queued', 'uploading', 'processing', 'completed', 'failed', 'expired', 'cancelled'] },
          percent:      { type: 'integer', minimum: 0, maximum: 100, nullable: true },
          downloadUrl:  { type: 'string', format: 'uri', nullable: true },
          expiresAt:    { type: 'string', format: 'date-time', nullable: true },
          error:        { type: 'string', nullable: true },
          queuedAt:     { type: 'string', format: 'date-time' },
          completedAt:  { type: 'string', format: 'date-time', nullable: true },
        },
      },
    },
  },

  UsageStats: {
    type: 'object',
    properties: {
      conversionsToday:    { type: 'integer', example: 3 },
      conversionsThisMonth: { type: 'integer', example: 47 },
      dailyLimit:          { type: 'integer', example: 10 },
      monthlyLimit:        { type: 'integer', example: 100 },
      storageUsedBytes:    { type: 'integer', example: 0 },
      planId:              { type: 'string', example: 'free' },
    },
  },
};

// ── Error response catalogue ───────────────────────────────────────────────

const ERROR_RESPONSES = {
  400: {
    description: 'Bad request — missing or invalid parameters',
    content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiError' },
      example: { ok: false, error: 'validation_error', message: 'file is required', status: 400 } } },
  },
  401: {
    description: 'Unauthorized — missing or invalid API key',
    content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiError' },
      example: { ok: false, error: 'invalid_api_key', message: 'Invalid or revoked API key', status: 401 } } },
  },
  403: {
    description: 'Forbidden — plan does not include this feature',
    content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiError' },
      example: { ok: false, error: 'plan_required', message: 'This tool requires a Pro plan or above', status: 403 } } },
  },
  413: {
    description: 'File too large for your plan',
    content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiError' },
      example: { ok: false, error: 'file_too_large', message: 'File exceeds 25 MB limit on Free plan', status: 413 } } },
  },
  429: {
    description: 'Rate limit or quota exceeded',
    headers: {
      'X-RateLimit-Limit':     { schema: { type: 'integer' }, description: 'Requests allowed per window' },
      'X-RateLimit-Remaining': { schema: { type: 'integer' }, description: 'Requests remaining' },
      'Retry-After':           { schema: { type: 'integer' }, description: 'Seconds until reset' },
    },
    content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiError' },
      example: { ok: false, error: 'rate_limited', message: 'Too many requests. Retry after 60s', status: 429 } } },
  },
  500: {
    description: 'Internal server error',
    content: { 'application/json': { schema: { '$ref': '#/components/schemas/ApiError' },
      example: { ok: false, error: 'internal_error', message: 'Unexpected error. Please retry', status: 500 } } },
  },
};

// ── Tool path generator ────────────────────────────────────────────────────

function generateToolPath(tool, config) {
  const toolName   = tool.name?.en || tool.slug;
  const keyword    = tool.seo?.primaryKeyword || tool.slug.replace(/-/g, ' ');
  const inputMimes = tool.inputFormats;
  const outputMimes = tool.outputFormats.map(f => f.mime);
  const defaultOutput = tool.outputFormats.find(f => f.default) || tool.outputFormats[0];

  const inputExts  = [...new Set(inputMimes.map(mimeToExt))];
  const outputExts = [...new Set(outputMimes.map(mimeToExt))];

  const exampleInputExt  = inputExts[0]  || 'file';
  const exampleOutputExt = outputExts[0] || 'out';
  const exampleInputMime = inputMimes[0] || 'application/octet-stream';

  const requestExample = {
    summary: `Convert a ${exampleInputExt.toUpperCase()} file`,
    value:   { outputFormat: defaultOutput?.mime || outputMimes[0] },
  };

  const responseExample = {
    ok: true,
    data: {
      jobId:        'job_1718000000_ab3f2c',
      status:       'completed',
      outputFormat: defaultOutput?.mime || outputMimes[0],
      downloadUrl:  `${config.site.baseUrl}/api/v1/jobs/job_1718000000_ab3f2c/download`,
      expiresAt:    new Date(Date.now() + 86400000).toISOString(),
      sizeBytes:    204800,
      durationMs:   320,
    },
    meta: { version: 'v1', generatedAt: new Date().toISOString() },
  };

  return {
    post: {
      operationId:  toolToOperationId(tool.slug),
      summary:      toolName,
      description:  tool.tagline?.en || `Convert files using the ${toolName}`,
      tags:         [tool.category],
      security:     [{ apiKey: [] }],
      'x-rate-limit': { free: '10/day', pro: '100/day', business: '1000/day' },
      requestBody: {
        required: true,
        content: {
          'multipart/form-data': {
            schema: {
              type: 'object',
              required: ['file'],
              properties: {
                file: {
                  type: 'string',
                  format: 'binary',
                  description: `Input file. Accepts: ${inputMimes.join(', ')}`,
                },
                outputFormat: outputMimes.length > 1 ? {
                  type: 'string',
                  enum: outputMimes,
                  default: defaultOutput?.mime,
                  description: 'Desired output format MIME type',
                } : undefined,
                options: {
                  type: 'string',
                  description: 'JSON-encoded conversion options (optional)',
                  example: '{"quality":90}',
                },
                webhook: {
                  type: 'string',
                  format: 'uri',
                  description: 'Webhook URL to call on completion (Pro+)',
                },
              },
            },
            encoding: { file: { contentType: inputMimes.join(', ') } },
            examples: { default: requestExample },
          },
        },
      },
      responses: {
        200: {
          description: `Conversion successful — returns job status and download URL`,
          headers: {
            'X-Job-Id':            { schema: { type: 'string' }, description: 'Job identifier' },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
          },
          content: {
            'application/json': {
              schema: { '$ref': '#/components/schemas/ConversionJob' },
              examples: { success: { summary: 'Completed job', value: responseExample } },
            },
          },
        },
        202: {
          description: 'Accepted — large file queued for async processing',
          content: { 'application/json': { schema: { '$ref': '#/components/schemas/ConversionJob' } } },
        },
        400: ERROR_RESPONSES[400],
        401: ERROR_RESPONSES[401],
        403: ERROR_RESPONSES[403],
        413: ERROR_RESPONSES[413],
        429: ERROR_RESPONSES[429],
        500: ERROR_RESPONSES[500],
      },
    },
  };
}

// ── Shared endpoints (non-tool) ────────────────────────────────────────────

const MANAGEMENT_PATHS = {
  '/jobs/{jobId}': {
    get: {
      operationId: 'get_job_status',
      summary: 'Get job status',
      description: 'Poll the status of an async conversion job.',
      tags: ['Jobs'],
      security: [{ apiKey: [] }],
      parameters: [{
        name: 'jobId', in: 'path', required: true,
        schema: { type: 'string', example: 'job_1718000000_ab3f2c' },
      }],
      responses: {
        200: { description: 'Job status', content: { 'application/json': { schema: { '$ref': '#/components/schemas/JobStatus' } } } },
        401: ERROR_RESPONSES[401],
        404: { description: 'Job not found' },
      },
    },
    delete: {
      operationId: 'cancel_job',
      summary: 'Cancel a job',
      tags: ['Jobs'],
      security: [{ apiKey: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: { 204: { description: 'Job cancelled' }, 401: ERROR_RESPONSES[401] },
    },
  },
  '/jobs/{jobId}/download': {
    get: {
      operationId: 'download_job_output',
      summary: 'Download conversion output',
      description: 'Download the output file from a completed job. Link expires based on plan.',
      tags: ['Jobs'],
      security: [{ apiKey: [] }],
      parameters: [{ name: 'jobId', in: 'path', required: true, schema: { type: 'string' } }],
      responses: {
        200: {
          description: 'Binary file download',
          content: { 'application/octet-stream': { schema: { type: 'string', format: 'binary' } } },
        },
        410: { description: 'Download link expired' },
      },
    },
  },
  '/usage': {
    get: {
      operationId: 'get_usage',
      summary: 'Get usage stats',
      description: 'Returns current usage counters and plan limits for the authenticated user.',
      tags: ['Account'],
      security: [{ apiKey: [] }],
      responses: {
        200: { description: 'Usage stats', content: { 'application/json': { schema: { '$ref': '#/components/schemas/UsageStats' } } } },
        401: ERROR_RESPONSES[401],
      },
    },
  },
};

// ── Main export ────────────────────────────────────────────────────────────

export function generateOpenApiSpec(data, config) {
  const siteName = config.site.name || 'DropAnyConvert';
  const baseUrl  = config.site.baseUrl || '';

  // Tags from categories + shared
  const tags = [
    ...(data.categories || []).map(c => ({
      name:        c.id,
      description: `${c.name?.en || c.id} conversion tools`,
    })),
    { name: 'Jobs',    description: 'Job management and status polling' },
    { name: 'Account', description: 'Usage and account information' },
  ];

  // Build paths: one per tool + management endpoints
  const paths = {};

  for (const tool of data.tools) {
    paths[`/convert/${tool.slug}`] = generateToolPath(tool, config);
  }

  Object.assign(paths, MANAGEMENT_PATHS);

  const spec = {
    openapi: '3.1.0',
    info: {
      title:       `${siteName} API`,
      version:     '1.0.0',
      description: `The ${siteName} REST API lets you convert files programmatically. Submit a file, get a download URL. Supports ${data.tools.length} conversion tools across ${(data.categories || []).length} categories.\n\nBase URL: \`${baseUrl}/api/v1\`\n\nAll requests require a Bearer API key in the \`Authorization\` header.`,
      contact: {
        name:  siteName,
        url:   `${baseUrl}/en/api`,
        email: `api@${(new URL(baseUrl || 'https://dropanyconvert.com')).hostname}`,
      },
      license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' },
      'x-logo': { url: `${baseUrl}/assets/images/icon-192.png` },
    },
    externalDocs: {
      description: 'Full API documentation',
      url:         `${baseUrl}/en/api`,
    },
    servers: [
      { url: `${baseUrl}/api/v1`, description: 'Production' },
      { url: 'http://localhost:3000/api/v1', description: 'Local development' },
    ],
    security: [{ apiKey: [] }],
    tags,
    components: {
      securitySchemes: {
        apiKey: {
          type:        'http',
          scheme:      'bearer',
          bearerFormat: 'API_KEY',
          description: `Pass your API key as a Bearer token.\n\nExample: \`Authorization: Bearer dac_your_api_key_here\`\n\nGet an API key at ${baseUrl}/en/dashboard/api-keys`,
        },
      },
      schemas: COMMON_SCHEMAS,
      responses: {
        Unauthorized:    ERROR_RESPONSES[401],
        RateLimited:     ERROR_RESPONSES[429],
        InternalError:   ERROR_RESPONSES[500],
      },
      parameters: {
        JobId: {
          name: 'jobId', in: 'path', required: true,
          schema: { type: 'string', pattern: '^job_[0-9]+_[a-z0-9]+$' },
          description: 'Job identifier returned by a conversion endpoint',
        },
      },
    },
    paths,
  };

  return spec;
}

export function generateOpenApiFile(data, config) {
  const spec = generateOpenApiSpec(data, config);
  return {
    path:    '/openapi.json',
    content: JSON.stringify(spec, null, 2),
  };
}
