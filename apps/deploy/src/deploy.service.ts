import { DeployStatusEntity, DeviceEntity, MapEntity, DeployStatusEnum, DeviceMapStateEnum, DeviceComponentStateEnum, ReleaseEntity } from '@app/common/database/entities';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeployStatusDto } from '@app/common/dto/deploy';
import { Repository } from 'typeorm';
import { MicroserviceClient, MicroserviceName } from '@app/common/microservice-client';
import { DeviceComponentStateDto } from '@app/common/dto/device/dto/device-software.dto';
import { DeviceTopicsEmit } from '@app/common/microservice-client/topics';
import { DeviceMapStateDto } from '@app/common/dto/device';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    @InjectRepository(ReleaseEntity) private readonly releaseRepo: Repository<ReleaseEntity>,
    @InjectRepository(DeployStatusEntity) private readonly deployStatusRepo: Repository<DeployStatusEntity>,
    @InjectRepository(DeviceEntity) private readonly deviceRepo: Repository<DeviceEntity>,
    @InjectRepository(MapEntity) private readonly mapRepo: Repository<MapEntity>,
    @Inject(MicroserviceName.DISCOVERY_SERVICE) private readonly deviceClient: MicroserviceClient,

  ) { }

  async updateDeployStatus(dplStatus: DeployStatusDto) {
    this.logger.log(`Update deploy status from device: "${dplStatus.deviceId}" for type: "${dplStatus.type}", with catalogId: "${dplStatus.catalogId}"`)

    const newStatus = this.deployStatusRepo.create(dplStatus);

    let device = await this.deviceRepo.findOne({ relations: { maps: true }, where: { ID: dplStatus.deviceId } })
    if (!device) {
      const newDevice = this.deviceRepo.create()
      newDevice.ID = dplStatus.deviceId
      device = await this.deviceRepo.save(newDevice)
      this.logger.log(`A new device with Id - ${device.ID} has been registered`)
    }
    newStatus.device = device;

    const component = await this.releaseRepo.findOneBy({ catalogId: dplStatus.catalogId });
    if (component) {
      const isSaved =  await this.upsertDeployStatus(newStatus);
      this.logger.debug(`Is saved: ${isSaved}`)
      if (isSaved){
        this.logger.log("Send device software state");
        let deviceState = new DeviceComponentStateDto();
        deviceState.catalogId = dplStatus.catalogId;
        deviceState.deviceId = dplStatus.deviceId;

        if (newStatus.deployStatus == DeployStatusEnum.DONE){
          deviceState.state = DeviceComponentStateEnum.INSTALLED;
        }else if(newStatus.deployStatus == DeployStatusEnum.UNINSTALL){
          deviceState.state = DeviceComponentStateEnum.UNINSTALLED;
        }else if(newStatus.deployStatus == DeployStatusEnum.ERROR){
          deviceState.state = DeviceComponentStateEnum.DEPLOY;
          deviceState.error = "Error";
        }else {
          deviceState.state = DeviceComponentStateEnum.DEPLOY;
        }
       
        this.deviceClient.emit(DeviceTopicsEmit.UPDATE_DEVICE_SOFTWARE_STATE, deviceState);
      }

      return isSaved
    }

    const map = await this.mapRepo.findOneBy({ catalogId: dplStatus.catalogId })
    if (map) {
      const isSaved =  await this.upsertDeployStatus(newStatus);
      if (isSaved){
        let state;
        if (newStatus.deployStatus == DeployStatusEnum.DONE){
          state = DeviceMapStateEnum.INSTALLED;
        }else if(newStatus.deployStatus == DeployStatusEnum.UNINSTALL){
          state = DeviceMapStateEnum.UNINSTALLED;
        }else{
          return
        } 
        this.logger.log("Send device map state")

        let deviceState = new DeviceMapStateDto();
        deviceState.state = state;
        deviceState.catalogId = dplStatus.catalogId;
        deviceState.deviceId = dplStatus.deviceId;
        this.deviceClient.emit(DeviceTopicsEmit.UPDATE_DEVICE_MAP_STATE, deviceState);
      }
      return isSaved;
    }
    throw new NotFoundException(`Not found Item with this catalogId: ${dplStatus.catalogId}`);
  }

  private async upsertDeployStatus(newStatus: DeployStatusEntity): Promise<Boolean> {
    let savedMap: any = await this.deployStatusRepo.createQueryBuilder()
      .insert()
      .values({ ...newStatus })
      .orIgnore()
      .execute()

    if (savedMap?.raw?.length == 0) {
      savedMap = await this.deployStatusRepo.createQueryBuilder()
        .update()
        .set({ ...newStatus })
        .where("deviceID = :deviceID", { deviceID: newStatus.device.ID })
        .andWhere("catalogId = :catalogId", { catalogId: newStatus.catalogId })
        .andWhere("current_time < :current_time", { current_time: newStatus.currentTime })
        .execute()
    }

    return savedMap?.raw?.length > 0 || savedMap.affected > 0
  }
}
