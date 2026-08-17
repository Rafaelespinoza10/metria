import { api } from '../../services/api';
import type {
  LatestMeasurement,
  LogMeasurementInput,
  Measurement,
  MeasurementType,
  PickedPhoto,
  ProgressPhoto,
} from './types';

export function fetchMeasurementTypes(): Promise<{ types: MeasurementType[] }> {
  return api<{ types: MeasurementType[] }>('/api/measurements/types');
}

export function fetchLatestMeasurements(): Promise<{ latest: LatestMeasurement[] }> {
  return api<{ latest: LatestMeasurement[] }>('/api/measurements/latest');
}

export function logMeasurement(input: LogMeasurementInput): Promise<{ measurement: Measurement }> {
  return api<{ measurement: Measurement }>('/api/measurements', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function fetchPhotos(): Promise<{ photos: ProgressPhoto[] }> {
  return api<{ photos: ProgressPhoto[] }>('/api/measurements/photos');
}

export function uploadPhoto(photo: PickedPhoto): Promise<{ photo: ProgressPhoto }> {
  const formData = new FormData();
  // React Native FormData file part: { uri, name, type }.
  formData.append('photo', {
    uri: photo.uri,
    name: photo.fileName,
    type: photo.mimeType,
  } as unknown as Blob);
  return api<{ photo: ProgressPhoto }>('/api/measurements/photos', {
    method: 'POST',
    body: formData,
  });
}
