import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

const mockParseResult = {
  semester: { id: 1, code: 'HK1-2025', name: 'HK1' },
  total: 1,
  valid: 1,
  alreadyEnrolled: 0,
  invalid: 0,
  errors: [],
  alreadyEnrolledDetails: [],
};

const mockImportResult = {
  semester: { id: 1, code: 'HK1-2025', name: 'HK1' },
  imported: 1,
  skipped: 0,
  skippedDetails: [],
};

describe('EnrollmentController', () => {
  let controller: EnrollmentController;
  let service: jest.Mocked<EnrollmentService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnrollmentController],
      providers: [
        {
          provide: EnrollmentService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({
              data: [],
              total: 0,
              page: 1,
              limit: 20,
              semester: { id: 1, code: 'HK1-2025', name: 'HK1' },
            }),
            parseImport: jest.fn().mockResolvedValue(mockParseResult),
            importEnrollments: jest.fn().mockResolvedValue(mockImportResult),
          },
        },
      ],
    }).compile();

    controller = module.get<EnrollmentController>(EnrollmentController);
    service = module.get(EnrollmentService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockFile = {
    originalname: 'students.xlsx',
    buffer: Buffer.from(''),
  } as Express.Multer.File;

  it('delegates findAll to service with query', async () => {
    const query = { page: 1, limit: 10 };
    await controller.findAll(query as any);
    expect(service.findAll).toHaveBeenCalledWith(query);
  });

  it('calls parseImport when action=parse', async () => {
    const result = await controller.importEnrollments(mockFile, 'parse', undefined);

    expect(service.parseImport).toHaveBeenCalledWith(mockFile.buffer, undefined);
    expect(result).toEqual(mockParseResult);
  });

  it('passes semesterId to parseImport when provided', async () => {
    await controller.importEnrollments(mockFile, 'parse', 5);

    expect(service.parseImport).toHaveBeenCalledWith(mockFile.buffer, 5);
  });

  it('calls importEnrollments when action=import', async () => {
    const result = await controller.importEnrollments(mockFile, 'import', undefined);

    expect(service.importEnrollments).toHaveBeenCalledWith(mockFile.buffer, undefined);
    expect(result).toEqual(mockImportResult);
  });

  it('throws BadRequestException when file is missing', async () => {
    await expect(
      controller.importEnrollments(undefined as any, 'parse', undefined),
    ).rejects.toThrow(
      new BadRequestException('Please select a file before parsing.'),
    );
  });

  it('throws BadRequestException for unsupported file extension', async () => {
    const csvFile = { ...mockFile, originalname: 'students.csv' } as Express.Multer.File;

    await expect(
      controller.importEnrollments(csvFile, 'parse', undefined),
    ).rejects.toThrow(
      new BadRequestException('Only .xlsx and .xls files are accepted'),
    );
  });

  it('throws BadRequestException for unknown action', async () => {
    await expect(
      controller.importEnrollments(mockFile, 'unknown' as any, undefined),
    ).rejects.toThrow(
      new BadRequestException('action must be "parse" or "import"'),
    );
  });
});
