export type AiErrorCode =
  | "AI_NOT_CONFIGURED"
  | "AI_RATE_LIMITED"
  | "AI_TIMEOUT"
  | "AI_UPSTREAM_ERROR"
  | "AI_EMPTY_RESPONSE";

export class AiProviderError extends Error {
  constructor(
    public readonly code: AiErrorCode,
    message: string,
    public readonly httpStatus: number,
    public readonly provider?: string,
    public readonly upstreamStatus?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
  }
}
