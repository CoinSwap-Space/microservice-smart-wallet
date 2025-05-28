import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validationSchema } from './config/validation';
import { SmartWalletModule } from './smart-wallet/smart-wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
    SmartWalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
