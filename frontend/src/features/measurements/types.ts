export interface MeasurementType {
  id: string;
  key: string;
  unit: string;
}

export interface Measurement {
  id: string;
  typeId: string;
  value: number;
  measuredAt: string;
  notes: string | null;
}

export interface LatestMeasurement {
  type: MeasurementType;
  measurement: Measurement;
}

export interface ProgressPhoto {
  id: string;
  fileKey: string;
  fileUrl: string;
  takenAt: string;
  notes: string | null;
}

export interface LogMeasurementInput {
  typeId: string;
  value: number;
  measuredAt: string;
  notes?: string;
}

export interface PickedPhoto {
  uri: string;
  mimeType: string;
  fileName: string;
}
