import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <View className="flex-1 items-center justify-center bg-white px-8">
      <Text className="text-4xl font-bold text-brand-dark">{t('common.appName')}</Text>
      <Text className="mt-3 text-center text-lg text-slate-600">{t('home.tagline')}</Text>
      <Text className="mt-10 text-center text-sm text-slate-400">{t('home.placeholder')}</Text>
    </View>
  );
}
