import { HttpException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';

export const DAILY_AI_LIMIT = 5;

@Injectable()
export class AiQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  async reserve(userId: string) {
    const day = new Date().toISOString().slice(0, 10);
    const token = randomUUID();
    // One atomic statement enforces both limits across serverless instances.
    // Only counters and an expiring lock are stored; prompts are never recorded here.
    const rows = await this.prisma.$queryRaw<{ attempts: number }[]>`
      INSERT INTO "AiGenerationUsage" ("userId", "day", "attempts", "lockToken", "lockedUntil")
      VALUES (${userId}, ${day}, 1, ${token}, NOW() + INTERVAL '90 seconds')
      ON CONFLICT ("userId", "day") DO UPDATE
      SET "attempts" = "AiGenerationUsage"."attempts" + 1,
          "lockToken" = EXCLUDED."lockToken", "lockedUntil" = EXCLUDED."lockedUntil"
      WHERE "AiGenerationUsage"."attempts" < ${DAILY_AI_LIMIT}
        AND "AiGenerationUsage"."lockedUntil" <= NOW()
      RETURNING "attempts"
    `;
    if (!rows.length)
      throw new HttpException(
        'Você atingiu o limite de 5 tentativas por dia (UTC), ou já tem uma geração em andamento.',
        429,
      );
    return async () => {
      await this.prisma.$executeRaw`
        UPDATE "AiGenerationUsage" SET "lockedUntil" = NOW()
        WHERE "userId" = ${userId} AND "day" = ${day} AND "lockToken" = ${token}
      `;
    };
  }
}
