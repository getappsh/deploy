import { Test, TestingModule } from "@nestjs/testing";
import { DeployService } from "./deploy.service";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ItemTypeEnum, DeployStatusEntity, DeployStatusEnum, DeviceEntity, MapEntity, UploadVersionEntity, DeviceMapStateEntity } from "@app/common/database/entities";
import { mockDeployStatusRepo, mockDeviceRepo, mockMapRepo, mockUploadVersionRepo } from "@app/common/database/test/support/__mocks__";
import { deployStatusDtoStub } from "@app/common/dto/deploy";
import { Repository } from "typeorm";
import { NotFoundException } from "@nestjs/common";
import { deviceEntityStub } from "@app/common/database/test/support/stubs";
import { mockDeviceMapStateRepo } from "@app/common/database/test/support/__mocks__/device-map-state.repo.mock";



 describe('DeployService', () => {
    let deployService: DeployService;
    let deployRepo: Repository<DeployStatusEntity>;
    let uploadVersionRepo: Repository<UploadVersionEntity>;
    let deviceRepo: Repository<DeviceEntity>;
    let mapRepo: Repository<MapEntity>;
    let deviceMapRepo: Repository<DeviceMapStateEntity>;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DeployService,
          {
            provide: getRepositoryToken(DeployStatusEntity),
            useValue: mockDeployStatusRepo()
          },
          {
            provide: getRepositoryToken(UploadVersionEntity),
            useValue: mockUploadVersionRepo()
          },
          {
            provide: getRepositoryToken(DeviceEntity),
            useValue: mockDeviceRepo()
          },
          {
            provide: getRepositoryToken(MapEntity),
            useValue: mockMapRepo()
          },          {
            provide: getRepositoryToken(DeviceMapStateEntity),
            useValue: mockDeviceMapStateRepo()
          }
        ],
    }).compile()

      deployService = module.get<DeployService>(DeployService);
      deployRepo = module.get<Repository<DeployStatusEntity>>(getRepositoryToken(DeployStatusEntity));
      uploadVersionRepo = module.get<Repository<UploadVersionEntity>>(getRepositoryToken(UploadVersionEntity));
      deviceRepo = module.get<Repository<DeviceEntity>>(getRepositoryToken(DeviceEntity));
      mapRepo = module.get<Repository<MapEntity>>(getRepositoryToken(MapEntity));
      deviceMapRepo = module.get<Repository<DeviceMapStateEntity>>(getRepositoryToken(DeviceMapStateEntity));


      jest.clearAllMocks();
    })
    
    describe('updateDeployStatus', () => {
      it('should create and save a new deploy status', async () => {
        const deployStatus = deployStatusDtoStub()
        const mockCreatedDeployStatus = deployRepo.create(deployStatus);

        const result = await deployService.updateDeployStatus(deployStatus);

        expect(result).toEqual(mockCreatedDeployStatus);
        expect(deployRepo.create).toHaveBeenCalledWith(deployStatus);
        expect(deviceRepo.findOne).toHaveBeenCalledWith({relations: {maps: true}, where: {ID: deployStatus.deviceId}})
        expect(uploadVersionRepo.findOneBy).toHaveBeenCalledWith({ catalogId: deployStatus.catalogId });
        expect(mapRepo.findOneBy).not.toHaveBeenCalled()
        expect(deployRepo.save).toHaveBeenCalledWith(mockCreatedDeployStatus);

      });

      it('should create and save a new deploy status and save map as installed on the device', async () => {
        let deployStatus = deployStatusDtoStub()
        deployStatus.type = ItemTypeEnum.MAP;
        deployStatus.deployStatus = DeployStatusEnum.DONE;

        uploadVersionRepo.findOneBy = jest.fn().mockImplementationOnce(()=> undefined);

        const mockCreatedDeployStatus = deployRepo.create(deployStatus);
        let deviceStub = deviceEntityStub()
        deviceStub.maps.push(deviceStub.maps[0])

        const result = await deployService.updateDeployStatus(deployStatus);
        
        expect(result.catalogId).toBe(mockCreatedDeployStatus.catalogId);
        expect(deployRepo.create).toHaveBeenCalledWith(deployStatus);
        expect(deviceRepo.findOne).toHaveBeenCalledWith({relations: {maps: true}, where: {ID: deployStatus.deviceId}})
       
        expect(uploadVersionRepo.findOneBy).toHaveBeenCalled()
        expect(mapRepo.findOneBy).toHaveBeenCalledWith({ catalogId: deployStatus.catalogId });
        // expect(deviceRepo.save).toHaveBeenCalledWith(deviceStub);


        expect(deployRepo.save).toHaveBeenCalledWith(mockCreatedDeployStatus);

      });

      it('should throw NotFoundException if device is not found', async () => {
        const deployStatus = deployStatusDtoStub()
        
        deviceRepo.findOne = jest.fn().mockImplementationOnce(()=> undefined);
          
        await expect(deployService.updateDeployStatus(deployStatus)).rejects.toThrowError(
          NotFoundException,
        );
        expect(deployRepo.create).toHaveBeenCalled();
        expect(deviceRepo.findOne).toHaveBeenCalledWith({relations: {maps: true}, where: {ID: deployStatus.deviceId}})
        expect(uploadVersionRepo.findOne).not.toHaveBeenCalledWith();
        expect(mapRepo.findOneBy).not.toHaveBeenCalled()
        expect(deployRepo.save).not.toHaveBeenCalled();
      });  

      it('should throw NotFoundException if map not found Item', async () => {
        let deployStatus = deployStatusDtoStub()
        
        uploadVersionRepo.findOneBy = jest.fn().mockImplementationOnce(()=> undefined);
        mapRepo.findOneBy = jest.fn().mockImplementationOnce(()=> undefined);
          
        await expect(deployService.updateDeployStatus(deployStatus)).rejects.toThrowError(
          NotFoundException,
        );
        expect(deployRepo.create).toHaveBeenCalled();
        expect(deviceRepo.findOne).toHaveBeenCalledWith({relations: {maps: true}, where: {ID: deployStatus.deviceId}})
        expect(uploadVersionRepo.findOneBy).toHaveBeenCalledWith({ catalogId: deployStatus.catalogId });
        expect(mapRepo.findOneBy).toHaveBeenCalledWith({ catalogId: deployStatus.catalogId });
        expect(deployRepo.save).not.toHaveBeenCalled();
      });  
    });
 });
