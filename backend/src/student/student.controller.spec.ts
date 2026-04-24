import { Test, TestingModule } from '@nestjs/testing';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

describe('StudentController', () => {
  let controller: StudentController;
  let service: jest.Mocked<StudentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: {
            create: jest.fn().mockResolvedValue({
              id: 10,
              studentId: 'S1',
              fullName: 'Name',
              email: 'e@x.com',
              hasAccount: false,
            }),
            findAll: jest
              .fn()
              .mockResolvedValue({ data: [], total: 0, page: 1, limit: 20 }),
            update: jest.fn().mockResolvedValue({
              id: 1,
              studentId: 'S1',
              fullName: 'Name',
              email: 'e@x.com',
              hasAccount: false,
            }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
    service = module.get(StudentService);
  });

  afterEach(() => jest.clearAllMocks());

  it('delegates create to service with dto', async () => {
    const dto = { studentId: 'S1', fullName: 'Name', email: 'e@x.com' };
    await controller.create(dto as any);
    expect(service.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findAll to service with query', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAll(query as any);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('delegates update to service with id and dto', async () => {
    await controller.update(1, { fullName: 'New' } as any);
    expect(service.update).toHaveBeenCalledWith(1, { fullName: 'New' });
  });

  it('delegates remove to service with id', async () => {
    await controller.remove(1);
    expect(service.remove).toHaveBeenCalledWith(1);
  });
});
