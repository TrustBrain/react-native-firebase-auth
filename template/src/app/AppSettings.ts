import i18n from 'i18n-js';
import {useCallback, useEffect, useState} from 'react';
import {I18nManager, Platform} from 'react-native';
import {
  findBestAvailableLanguage,
  addEventListener,
  // removeEventListener,
} from 'react-native-localize';
import analytics from '@react-native-firebase/analytics';
import auth from '@react-native-firebase/auth';
import {translations} from './translations';

export type LanguageLocale = {
  languageTag: string;
  isRTL: boolean;
};

export const fallbackLanguageLocale: LanguageLocale = {
  languageTag: 'en',
  isRTL: false,
};

export const useAppSettings = () => {
  const [languageLocale, setLanguageLocale] = useState<LanguageLocale | null>(
    null,
  );
  const [listening, setListening] = useState(false);

  const configureI18n = useCallback(languageTag => {
    i18n.translations = translations;
    i18n.locale = languageTag;
    i18n.fallbacks = true;
    i18n.defaultLocale = fallbackLanguageLocale.languageTag.substring(0, 2);
    if (Platform.OS === 'web') {
      auth().languageCode = languageTag;
    } else {
      auth().setLanguageCode(languageTag);
    }

    // Missing translations is a common problem. Log them in analytics for visibility.
    i18n.missingTranslation = (param: any, otherParam: any) => {
      console.log(
        `AppSettings::t - missing translation - received param / otherparam: ${param}`,
        otherParam,
      );

      analytics().logEvent('I18N_Not_Translated', {
        i18n_key: `${languageTag}.${param}`,
      });
      let translation = `I18N: ${param}`;
      if (otherParam && otherParam.default) {
        translation += ` (${otherParam.default})`;
      }
      return translation;
    };
  }, []);

  const listener = useCallback(() => {
    const bestAvailable =
      findBestAvailableLanguage(Object.keys(translations)) ??
      fallbackLanguageLocale;
    setLanguageLocale(bestAvailable);
    I18nManager.forceRTL(bestAvailable.isRTL);
    configureI18n(bestAvailable.languageTag);
  }, [configureI18n]);

  useEffect(() => {
    listener();

    if (!listening) {
      addEventListener('change', listener);
      setListening(true);
    }

    // return () => {
    //   removeEventListener('change', listener);
    //   console.log('AppSettings::useEffect::removed listener');
    // };
  }, [listening, listener]);

  return {
    languageLocale,
    t: (key: string, config?: any) => i18n.t(key, config),
  };
};