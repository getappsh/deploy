import { Module } from '@nestjs/common';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { DatabaseModule } from '@app/common';
import { UploadVersionEntity, DeployStatusEntity, DeviceEntity, MapEntity, DeviceMapStateEntity } from '@app/common/database/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@app/common/logger/logger.module';
import { ApmModule } from '@app/common/apm/apm.module';

@Module({
  imports: [
    LoggerModule.forRoot({httpCls: false, jsonLogger: process.env.LOGGER_FORMAT === 'JSON', name: "Deploy"}),
    ApmModule,
    DatabaseModule,
    TypeOrmModule.forFeature([
      UploadVersionEntity, 
      DeployStatusEntity,
      DeviceEntity,
      MapEntity,
      DeviceMapStateEntity
    ])
  ],
  controllers: [DeployController],
  providers: [DeployService],
})
export class DeployModule {}
