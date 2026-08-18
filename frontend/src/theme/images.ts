import type { ImageSourcePropType } from 'react-native';

/** Bundled photography (Unsplash License — free for commercial use, no attribution
 *  required). Curated warm food/fitness set, ~100 KB each at 800 px. */
export const mealCategoryImages: Record<string, ImageSourcePropType> = {
  breakfast: require('../../assets/images/breakfast.jpg') as ImageSourcePropType,
  lunch: require('../../assets/images/lunch.jpg') as ImageSourcePropType,
  dinner: require('../../assets/images/dinner.jpg') as ImageSourcePropType,
  snack: require('../../assets/images/snack.jpg') as ImageSourcePropType,
};

export const sectionImages = {
  authHero: require('../../assets/images/auth-hero.jpg') as ImageSourcePropType,
  workout: require('../../assets/images/workout.jpg') as ImageSourcePropType,
  goals: require('../../assets/images/goals.jpg') as ImageSourcePropType,
  sleep: require('../../assets/images/sleep.jpg') as ImageSourcePropType,
  activity: require('../../assets/images/activity.jpg') as ImageSourcePropType,
};
