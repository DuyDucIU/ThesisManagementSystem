import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';

const mockParseResult = {
  total: 1, valid: 1, alreadyEnrolled: 0, invalid: 0, errors: [], alreadyEnrolledDetails: [],
};
const mockImportResult = { imported: 1, skipped: 0, skippedDetails: [] };

describe('StudentController', () => {
  let controller: StudentController;
  let service: { parseImport: jest.Mock; importStudents: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StudentController],
      providers: [
        {
          provide: StudentService,
          useValue: {
            parseImport: jest.fn().mockResolvedValue(mockParseResult),
            importStudents: jest.fn().mockResolvedValue(mockImportResult),
          },
        },
      ],
    }).compile();

    controller = module.get<StudentController>(StudentController);
    service = module.get(StudentService);
  });

  afterEach(() => jest.clearAllMocks());

  const mockFile = {
    originalname: 'students.xlsx',
    buffer: Buffer.from(''),
  } as Express.Multer.File;

  it('calls parseImport when action=parse', async () => {
    const result = await controller.importStudents(mockFile, 'parse');

    expect(service.parseImport).toHaveBeenCalledWith(mockFile.buffer);
    expect(result).toEqual(mockParseResult);
  });

  it('calls importStudents when action=import', async () => {
    const result = await controller.importStudents(mockFile, 'import');

    expect(service.importStudents).toHaveBeenCalledWith(mockFile.buffer);
    expect(result).toEqual(mockImportResult);
  });

  it('throws BadRequestException when file is missing', async () => {
    await expect(
      controller.importStudents(undefined as any, 'parse'),
    ).rejects.toThrow(new BadRequestException('Please select a file before parsing.'));
  });

  it('throws BadRequestException for unsupported file extension', async () => {
    const csvFile = { ...mockFile, originalname: 'students.csv' } as Express.Multer.File;

    await expect(
      controller.importStudents(csvFile, 'parse'),
    ).rejects.toThrow(new BadRequestException('Only .xlsx and .xls files are accepted'));
  });

  it('throws BadRequestException for unknown action', async () => {
    await expect(
      controller.importStudents(mockFile, 'unknown' as any),
    ).rejects.toThrow(new BadRequestException('action must be "parse" or "import"'));
  });
});
