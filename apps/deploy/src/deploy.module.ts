import { Module } from '@nestjs/common';
import { DeployController } from './deploy.controller';
import { DeployService } from './deploy.service';
import { DatabaseModule } from '@app/common';
import { DeployStatusEntity, DeviceEntity, MapEntity, ReleaseEntity } from '@app/common/database/entities';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@app/common/logger/logger.module';
import { ApmModule } from '@app/common/apm/apm.module';
import { MicroserviceModule, MicroserviceName, MicroserviceType } from '@app/common/microservice-client';
import { ConfigModule } from '@nestjs/config';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({httpCls: false, jsonLogger: process.env.LOGGER_FORMAT === 'JSON', name: "Deploy"}),
    MicroserviceModule.register({
      name: MicroserviceName.DISCOVERY_SERVICE,
      type: MicroserviceType.DISCOVERY,
    }),
    ApmModule,
    DatabaseModule,
    TypeOrmModule.forFeature([
      ReleaseEntity, 
      DeployStatusEntity,
      DeviceEntity,
      MapEntity
    ])
  ],
  controllers: [DeployController],
  providers: [DeployService],
})
export class DeployModule {}
