import { Test, TestingModule } from '@nestjs/testing';
import { SemesterStatus } from '@prisma/client';
import { SemesterController } from './semester.controller';
import { SemesterService } from './semester.service';

const mockSemester = {
  id: 1,
  code: 'HK1-2025',
  name: 'Học kỳ 1 năm 2025-2026',
  startDate: new Date('2025-09-01'),
  endDate: new Date('2026-01-15'),
  status: SemesterStatus.INACTIVE,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('SemesterController', () => {
  let controller: SemesterController;
  let service: jest.Mocked<SemesterService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SemesterController],
      providers: [
        {
          provide: SemesterService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            activate: jest.fn(),
            deactivate: jest.fn(),
            close: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SemesterController>(SemesterController);
    service = module.get(SemesterService);
  });

  afterEach(() => jest.clearAllMocks());

  it('findAll delegates to service with query', async () => {
    service.findAll.mockResolvedValue([mockSemester]);
    const result = await controller.findAll({ status: SemesterStatus.ACTIVE });
    expect(service.findAll).toHaveBeenCalledWith({ status: SemesterStatus.ACTIVE });
    expect(result).toEqual([mockSemester]);
  });

  it('findOne delegates to service with parsed id', async () => {
    service.findOne.mockResolvedValue(mockSemester);
    const result = await controller.findOne(1);
    expect(service.findOne).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockSemester);
  });

  it('create delegates to service with dto', async () => {
    service.create.mockResolvedValue(mockSemester);
    const dto = {
      code: 'HK1-2025',
      name: 'Học kỳ 1',
      startDate: '2025-09-01',
      endDate: '2026-01-15',
    };
    const result = await controller.create(dto);
    expect(service.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual(mockSemester);
  });

  it('update delegates to service with id and dto', async () => {
    service.update.mockResolvedValue(mockSemester);
    const result = await controller.update(1, { name: 'Updated' });
    expect(service.update).toHaveBeenCalledWith(1, { name: 'Updated' });
    expect(result).toEqual(mockSemester);
  });

  it('remove delegates to service with id', async () => {
    service.remove.mockResolvedValue(mockSemester);
    const result = await controller.remove(1);
    expect(service.remove).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockSemester);
  });

  it('activate delegates to service with id', async () => {
    service.activate.mockResolvedValue({
      ...mockSemester,
      status: SemesterStatus.ACTIVE,
    });
    const result = await controller.activate(1);
    expect(service.activate).toHaveBeenCalledWith(1);
    expect(result.status).toBe(SemesterStatus.ACTIVE);
  });

  it('deactivate delegates to service with id', async () => {
    service.deactivate.mockResolvedValue(mockSemester);
    const result = await controller.deactivate(1);
    expect(service.deactivate).toHaveBeenCalledWith(1);
    expect(result).toEqual(mockSemester);
  });

  it('close delegates to service with id', async () => {
    service.close.mockResolvedValue({
      ...mockSemester,
      status: SemesterStatus.CLOSED,
    });
    const result = await controller.close(1);
    expect(service.close).toHaveBeenCalledWith(1);
    expect(result.status).toBe(SemesterStatus.CLOSED);
  });
});
