import { UploadVersionEntity, DeployStatusEntity, DeviceEntity, MapEntity, DeployStatusEnum, DeviceMapStateEntity, DeviceMapStateEnum } from '@app/common/database/entities';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeployStatusDto } from '@app/common/dto/deploy';
import { Repository } from 'typeorm';

@Injectable()
export class DeployService {
  private readonly logger = new Logger(DeployService.name);

  constructor(
    @InjectRepository(UploadVersionEntity) private readonly uploadVersionRepo: Repository<UploadVersionEntity>,
    @InjectRepository(DeployStatusEntity) private readonly deployStatusRepo: Repository<DeployStatusEntity>,
    @InjectRepository(DeviceEntity) private readonly deviceRepo: Repository<DeviceEntity>,
    @InjectRepository(MapEntity) private readonly mapRepo: Repository<MapEntity>,
    @InjectRepository(DeviceMapStateEntity) private readonly deviceMapRepo: Repository<DeviceMapStateEntity>,

  ) { }

  async updateDeployStatus(dplStatus: DeployStatusDto) {
    this.logger.log(`Update deploy status from device: "${dplStatus.deviceId}" for type: "${dplStatus.type}", with catalogId: "${dplStatus.catalogId}"`)

    const newStatus = this.deployStatusRepo.create(dplStatus);

    let device = await this.deviceRepo.findOne({ relations: { maps: true }, where: { ID: dplStatus.deviceId } })
    if (!device) {
      throw new NotFoundException('Device not found');
    }
    newStatus.device = device;

    const component = await this.uploadVersionRepo.findOneBy({ catalogId: dplStatus.catalogId });
    if (component) {
      return this.deployStatusRepo.save(newStatus);
    }

    const map = await this.mapRepo.findOneBy({ catalogId: dplStatus.catalogId })
    if (map) {
      const savedMap = await this.deployStatusRepo.save(newStatus)
      
      // TODO write test
      let deviceMap = await this.deviceMapRepo.findOne({
        where: {
          device: { ID: device.ID },
          map: { catalogId: map.catalogId },
        }
      });
      if (deviceMap) {
        this.logger.log(`Save state of map ${map.catalogId} for device ${device.ID}`)
        deviceMap.state = DeviceMapStateEnum.INSTALLED
      } else {
        deviceMap = this.deviceMapRepo.create({ device, map, state: DeviceMapStateEnum.DELIVERY })
      }
      this.deviceMapRepo.save(deviceMap)
      return savedMap;
    }
    throw new NotFoundException(`Not found Item with this catalogId: ${dplStatus.catalogId}`);
  }
}
