import { Controller, Logger } from '@nestjs/common';
import { DeployService } from './deploy.service';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { DeployTopics, DeployTopicsEmit } from '@app/common/microservice-client/topics';
import { DeployStatusDto } from '@app/common/dto/deploy';
import { RpcPayload } from '@app/common/microservice-client';
import * as fs from 'fs';

@Controller()
export class DeployController {
  private readonly logger = new Logger(DeployController.name);

  constructor(private readonly deployService: DeployService) {}

  @EventPattern(DeployTopicsEmit.UPDATE_DEPLOY_STATUS)
  updateDeployStatus(@RpcPayload() data: DeployStatusDto) {
    this.deployService.updateDeployStatus(data).catch(e => {
        this.logger.error(`Error update deploy status: ${e.message}`)
      });
  }

  @MessagePattern(DeployTopics.CHECK_HEALTH)
  checkHealth(){
    const version = this.readImageVersion()
    this.logger.log(`Deploy service - Health checking, Version: ${version}`)
    return "Deploy service is success, Version: " + version
  }

  private readImageVersion(){
    let version = 'unknown'
    try{
      version = fs.readFileSync('NEW_TAG.txt','utf8');
    }catch(error){
      this.logger.error(`Unable to read image version - error: ${error}`)
    }
    return version
  }
}
