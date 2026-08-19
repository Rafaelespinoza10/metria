import { Image as ExpoImage } from 'expo-image';
import { cssInterop } from 'nativewind';
import { API_URL } from '../services/api';
import { useAuthStore } from '../store/auth';

const StyledImage = cssInterop(ExpoImage, { className: 'style' });

interface AuthedImageProps {
  /** Backend-relative upload URL, e.g. "/api/uploads/users/…". */
  url: string;
  className?: string;
  accessibilityLabel?: string;
}

/** Authenticated upload rendering with a real disk cache — RN's core Image
 *  bypasses its cache for requests that carry an Authorization header, so
 *  photos re-downloaded on every mount. expo-image caches them properly. */
export function AuthedImage({ url, className, accessibilityLabel }: AuthedImageProps) {
  const token = useAuthStore((state) => state.token);

  return (
    <StyledImage
      source={{
        uri: `${API_URL}${url}`,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      }}
      cachePolicy="disk"
      transition={150}
      className={className}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      accessibilityIgnoresInvertColors
    />
  );
}
