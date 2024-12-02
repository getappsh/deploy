import { Controller, Logger } from '@nestjs/common';
import { DeployService } from './deploy.service';
import { EventPattern, MessagePattern } from '@nestjs/microservices';
import { DeployTopics, DeployTopicsEmit } from '@app/common/microservice-client/topics';

@Controller()
export class DeployController {
  private readonly logger = new Logger(DeployController.name);

  constructor(private readonly deployService: DeployService) {}

  @EventPattern(DeployTopicsEmit.UPDATE_DEPLOY_STATUS)
  updateDeployStatus(data: any) {
    this.deployService.updateDeployStatus(data).catch(e => {
        this.logger.error(`Error update deploy status: ${e.message}`)
      });
  }

  @MessagePattern(DeployTopics.CHECK_HEALTH)
  healthCheckSuccess(){
    return "Deploy service is success"
  }
}
