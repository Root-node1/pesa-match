import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { FakeSmsProvider } from './fake-sms.provider.js';
import { ThriveWaveSmsProvider } from './thrivewave-sms.provider.js';

@Module({
  imports: [ConfigModule],
  providers: [
    FakeSmsProvider,
    ThriveWaveSmsProvider,
    {
      provide: 'SMS_PROVIDER',
      useFactory: (config: ConfigService, fake: FakeSmsProvider, thrivewave: ThriveWaveSmsProvider) => {
        const mode = config.get<string>('SMS_PROVIDER') ?? 'auto';
        if (mode === 'fake') return fake;
        if (mode === 'thrivewave') return thrivewave;
        const hasCreds = config.get<string>('THRIVEWAVE_API_BASE_URL') && config.get<string>('THRIVEWAVE_API_KEY') && config.get<string>('THRIVEWAVE_SENDER_ID');
        return hasCreds ? thrivewave : fake;
      },
      inject: [ConfigService, FakeSmsProvider, ThriveWaveSmsProvider],
    },
  ],
  exports: ['SMS_PROVIDER'],
})
export class SmsModule {}
