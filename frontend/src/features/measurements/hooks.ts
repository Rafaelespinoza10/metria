import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  fetchLatestMeasurements,
  fetchMeasurementTypes,
  fetchPhotos,
  logMeasurement,
  uploadPhoto,
} from './api';

export function useMeasurementTypes() {
  return useQuery({
    queryKey: ['measurement-types'],
    queryFn: fetchMeasurementTypes,
    select: (data) => data.types,
    staleTime: Infinity,
  });
}

export function useLatestMeasurements() {
  return useQuery({
    queryKey: ['measurements', 'latest'],
    queryFn: fetchLatestMeasurements,
    select: (data) => data.latest,
  });
}

export function useLogMeasurement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: logMeasurement,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['measurements'] }),
  });
}

export function usePhotos() {
  return useQuery({
    queryKey: ['photos'],
    queryFn: fetchPhotos,
    select: (data) => data.photos,
  });
}

export function useUploadPhoto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadPhoto,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['photos'] }),
  });
}
