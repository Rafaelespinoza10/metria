import { and, desc, eq, gte, isNull, lte, or, sql } from 'drizzle-orm';
import { getDb } from '../../database/client.js';
import {
  measurementTypes,
  measurements,
  progressPhotos,
} from '../../database/schema/measurements.js';

export type MeasurementTypeRow = typeof measurementTypes.$inferSelect;
export type MeasurementRow = typeof measurements.$inferSelect;
export type ProgressPhotoRow = typeof progressPhotos.$inferSelect;

export interface CreateMeasurementData {
  userId: string;
  typeId: string;
  value: number;
  measuredAt: Date;
  notes?: string | undefined;
}

export interface UpdateMeasurementData {
  value?: number | undefined;
  measuredAt?: Date | undefined;
  notes?: string | null | undefined;
}

export interface ListMeasurementsFilter {
  typeId?: string | undefined;
  from?: Date | undefined;
  to?: Date | undefined;
}

export class MeasurementsRepository {
  private get db() {
    return getDb();
  }

  /** System types plus (later) the user's custom types. */
  async listTypesForUser(userId: string): Promise<MeasurementTypeRow[]> {
    return this.db
      .select()
      .from(measurementTypes)
      .where(or(isNull(measurementTypes.userId), eq(measurementTypes.userId, userId)))
      .orderBy(measurementTypes.key);
  }

  async findTypeForUser(typeId: string, userId: string): Promise<MeasurementTypeRow | undefined> {
    const [row] = await this.db
      .select()
      .from(measurementTypes)
      .where(
        and(
          eq(measurementTypes.id, typeId),
          or(isNull(measurementTypes.userId), eq(measurementTypes.userId, userId)),
        ),
      )
      .limit(1);
    return row;
  }

  async create(data: CreateMeasurementData): Promise<MeasurementRow> {
    const [row] = await this.db.insert(measurements).values(data).returning();
    if (!row) throw new Error('measurements insert returned no row');
    return row;
  }

  async listByUser(userId: string, filter: ListMeasurementsFilter): Promise<MeasurementRow[]> {
    const conditions = [eq(measurements.userId, userId), isNull(measurements.deletedAt)];
    if (filter.typeId) conditions.push(eq(measurements.typeId, filter.typeId));
    if (filter.from) conditions.push(gte(measurements.measuredAt, filter.from));
    if (filter.to) conditions.push(lte(measurements.measuredAt, filter.to));
    return this.db
      .select()
      .from(measurements)
      .where(and(...conditions))
      .orderBy(desc(measurements.measuredAt))
      .limit(500);
  }

  /** Latest non-deleted entry per type for the user. */
  async latestByType(userId: string): Promise<MeasurementRow[]> {
    return this.db
      .selectDistinctOn([measurements.typeId])
      .from(measurements)
      .where(and(eq(measurements.userId, userId), isNull(measurements.deletedAt)))
      .orderBy(measurements.typeId, desc(measurements.measuredAt), sql`${measurements.id}`);
  }

  async update(
    id: string,
    userId: string,
    data: UpdateMeasurementData,
  ): Promise<MeasurementRow | undefined> {
    const [row] = await this.db
      .update(measurements)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(
          eq(measurements.id, id),
          eq(measurements.userId, userId),
          isNull(measurements.deletedAt),
        ),
      )
      .returning();
    return row;
  }

  async softDelete(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(measurements)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(measurements.id, id),
          eq(measurements.userId, userId),
          isNull(measurements.deletedAt),
        ),
      )
      .returning({ id: measurements.id });
    return row !== undefined;
  }

  async createPhoto(data: {
    userId: string;
    fileKey: string;
    takenAt: Date;
    notes?: string | undefined;
  }): Promise<ProgressPhotoRow> {
    const [row] = await this.db.insert(progressPhotos).values(data).returning();
    if (!row) throw new Error('progress_photos insert returned no row');
    return row;
  }

  async listPhotos(userId: string): Promise<ProgressPhotoRow[]> {
    return this.db
      .select()
      .from(progressPhotos)
      .where(and(eq(progressPhotos.userId, userId), isNull(progressPhotos.deletedAt)))
      .orderBy(desc(progressPhotos.takenAt));
  }

  async softDeletePhoto(id: string, userId: string): Promise<boolean> {
    const [row] = await this.db
      .update(progressPhotos)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(progressPhotos.id, id),
          eq(progressPhotos.userId, userId),
          isNull(progressPhotos.deletedAt),
        ),
      )
      .returning({ id: progressPhotos.id });
    return row !== undefined;
  }
}
