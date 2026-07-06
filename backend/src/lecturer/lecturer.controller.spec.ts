import { Test, TestingModule } from '@nestjs/testing';
import { LecturerController } from './lecturer.controller';
import { LecturerService } from './lecturer.service';

describe('LecturerController', () => {
  let controller: LecturerController;
  let service: jest.Mocked<LecturerService>;

  const LECTURER_ID = '11111111-1111-1111-1111-111111111111';

  const mockResponse = {
    id: LECTURER_ID,
    lecturerId: 'GV001',
    fullName: 'Nguyen Van A',
    email: 'nguyen@hcmiu.edu.vn',
    title: 'Dr.',
    maxStudents: 5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LecturerController],
      providers: [
        {
          provide: LecturerService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockResponse),
            findAll: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
            findOne: jest.fn().mockResolvedValue(mockResponse),
            update: jest.fn().mockResolvedValue(mockResponse),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<LecturerController>(LecturerController);
    service = module.get(LecturerService);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates create to service with dto', async () => {
    const dto = { lecturerId: 'GV001', fullName: 'Nguyen Van A', email: 'nguyen@hcmiu.edu.vn' };
    await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to service with query', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAll(query as any);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates findOne to service with id', async () => {
    await controller.findOne(LECTURER_ID);
    expect(service.findOne).toHaveBeenCalledWith(LECTURER_ID);
  });

  it('delegates update to service with id and dto', async () => {
    await controller.update(LECTURER_ID, { fullName: 'New' } as any);
    expect(service.update).toHaveBeenCalledWith(LECTURER_ID, { fullName: 'New' });
  });

  it('delegates remove to service with id', async () => {
    await controller.remove(LECTURER_ID);
    expect(service.remove).toHaveBeenCalledWith(LECTURER_ID);
  });
});
