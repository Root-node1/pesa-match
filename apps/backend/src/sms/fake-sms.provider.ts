import { Injectable } from '@nestjs/common';
import { SmsProvider, SmsSendRequest, SmsSendResult } from './sms-provider.interface.js';
import * as crypto from 'crypto';

@Injectable()
export class FakeSmsProvider implements SmsProvider {
  readonly name = 'fake';
  async send(_request: SmsSendRequest): Promise<SmsSendResult> {
    return {
      accepted: true,
      providerMessageId: `fake-${crypto.randomUUID()}`,
      providerStatus: 'SUBMITTED',
      errorMessage: null,
    };
  }
}
