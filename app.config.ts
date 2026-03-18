import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => {
  // EXPO_PUBLIC_APP_ENV est fourni par l'environnement ou les fichiers .env
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV ?? "development";

  return {
    ...config,
    name: appEnv === "production" ? "AfroPlan" : `AfroPlan (${appEnv})`,
    slug: "afroplan",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/logo_afroplan.png",
    scheme: "afroplan",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/images/logo_afroplan.png",
      resizeMode: "contain",
      backgroundColor: "#191919",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.afroplan.app",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/logo_afroplan.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },
      package: "com.afroplan.app",
      versionCode: 1,
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
        },
      },
      permissions: [
        "android.permission.INTERNET",
        "android.permission.CAMERA",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.READ_MEDIA_IMAGES",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.ico",
    },
    plugins: [
      "expo-router",
      "expo-audio",
      "expo-video",
      "expo-secure-store",
      "expo-apple-authentication",
      "@react-native-google-signin/google-signin",
      [
        "expo-image-picker",
        {
          photosPermission: "AfroPlan a besoin d'accéder à vos photos pour vous permettre de choisir une photo de profil.",
          cameraPermission: "AfroPlan a besoin d'accéder à votre appareil photo pour vous permettre de prendre une photo de profil."
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "AfroPlan utilise votre position pour trouver les salons de coiffure près de chez vous.",
          locationWhenInUsePermission:
            "AfroPlan utilise votre position pour trouver les salons de coiffure près de chez vous.",
        },
      ],
      [
        "@stripe/stripe-react-native",
        {
          merchantIdentifier: "merchant.com.afroplan.app",
          enableGooglePay: true,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      router: {
        origin: false,
      },
      eas: {
        projectId: "b133bcbd-6f4e-465b-99d8-66efa944eaa9",
      },
      appEnv,
    },
  };
};
