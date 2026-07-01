export type ApiMeta = {
  requestId: string;
  timestamp: string;
  durationMs?: number;
};

export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta: ApiMeta;
};

export type ApiError = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta: ApiMeta;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

type ResponseContext = {
  requestId: string;
  startedAt: number;
};

function createMeta(context: ResponseContext): ApiMeta {
  return {
    requestId: context.requestId,
    timestamp: new Date().toISOString(),
    durationMs: Date.now() - context.startedAt,
  };
}

export function jsonSuccess<T>(data: T, context: ResponseContext, status = 200) {
  const body: ApiSuccess<T> = { success: true, data, meta: createMeta(context) };
  return Response.json(body, { status });
}

export function jsonError(
  code: string,
  message: string,
  context: ResponseContext,
  status: number,
  details?: unknown,
) {
  const body: ApiError = {
    success: false,
    error: { code, message, ...(details === undefined ? {} : { details }) },
    meta: createMeta(context),
  };
  return Response.json(body, { status });
}
