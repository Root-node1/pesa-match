export interface SmsSendRequest {
  to: string;
  message: string;
  senderId?: string;
}

export interface SmsSendResult {
  accepted: boolean;
  providerMessageId: string | null;
  providerStatus: string;
  errorMessage: string | null;
}

export interface SmsProvider {
  readonly name: string;
  send(request: SmsSendRequest): Promise<SmsSendResult>;
}
