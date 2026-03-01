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

  constructor(private readonly deployService: DeployService) { }

  @EventPattern(DeployTopicsEmit.UPDATE_DEPLOY_STATUS)
  updateDeployStatus(@RpcPayload() data: DeployStatusDto) {
    this.deployService.updateDeployStatus(data).catch(e => {
      this.logger.error(`Error update deploy status: ${e.message}`)
    });
  }

  @MessagePattern(DeployTopics.CHECK_HEALTH)
  checkHealth() {
    const version = this.readImageVersion()
    this.logger.log(`Deploy service - Health checking, Version: ${version}`)
    return "Deploy service is success, Version: " + version
  }

  @MessagePattern(DeployTopics.GET_DEPLOY_STATUSES)
  async getDeployStatuses(@RpcPayload() data: any) {
    this.logger.log(`Get deploy statuses for catalogId: ${data.catalogId}`);
    try {
      return await this.deployService.getDeployStatuses(data.catalogId);
    } catch (error) {
      this.logger.error(`Error getting deploy statuses: ${error.message}`);
      return [];
    }
  }

  private readImageVersion() {
    let version = 'unknown'
    try {
      version = fs.readFileSync('deploy_image_version.txt', 'utf8');
    } catch (error) {
      this.logger.error(`Unable to read image version - error: ${error}`)
    }
    return version
  }
}
