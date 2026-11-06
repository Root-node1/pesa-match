import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider, SmsSendRequest, SmsSendResult } from './sms-provider.interface.js';

@Injectable()
export class ThriveWaveSmsProvider implements SmsProvider {
  readonly name = 'thrivewave';
  constructor(private config: ConfigService) {}
  async send(_request: SmsSendRequest): Promise<SmsSendResult> {
    const baseUrl = this.config.get<string>('THRIVEWAVE_API_BASE_URL');
    const apiKey = this.config.get<string>('THRIVEWAVE_API_KEY');
    const senderId = this.config.get<string>('THRIVEWAVE_SENDER_ID');
    if (!baseUrl || !apiKey || !senderId) {
      throw new Error('ThriveWave provider is not configured. Missing THRIVEWAVE_API_BASE_URL, THRIVEWAVE_API_KEY or THRIVEWAVE_SENDER_ID.');
    }
    // The verified ThriveWave HTTP contract is not available in this repository.
    // Do not fabricate a request. Fail explicitly instead of sending.
    throw new Error('ThriveWave API contract is not verified in this codebase. Configure official documentation before enabling live sends.');
  }
}
