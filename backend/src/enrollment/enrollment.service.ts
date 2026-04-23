import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Semester, SemesterStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EnrollmentService {
  constructor(private prisma: PrismaService) {}

  private async resolveTargetSemester(
    semesterId: number | undefined,
    { allowClosed }: { allowClosed: boolean },
  ): Promise<Semester> {
    if (semesterId != null) {
      const semester = await this.prisma.semester.findUnique({
        where: { id: semesterId },
      });
      if (!semester) {
        throw new NotFoundException(`Semester #${semesterId} not found`);
      }
      if (!allowClosed && semester.status === SemesterStatus.CLOSED) {
        throw new BadRequestException('Cannot import into a closed semester');
      }
      return semester;
    }

    const active = await this.prisma.semester.findFirst({
      where: { status: SemesterStatus.ACTIVE },
    });
    if (!active) {
      throw new BadRequestException(
        'No active semester — please specify semesterId',
      );
    }
    return active;
  }
}
