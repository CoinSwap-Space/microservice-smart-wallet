import { Module } from '@nestjs/common';
import { DynamicDatabaseService } from 'src/utils/dynamic-database-service';
import { SmartWalletController } from './controllers/smart-wallet.controller';

@Module({
  controllers: [SmartWalletController],
  providers: [DynamicDatabaseService],
})
export class SmartWalletModule {}
