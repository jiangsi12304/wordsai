import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.wordsai.app',
  appName: 'WordsAI',
  webDir: 'public',
  // 使用本地服务器模式运行 Next.js
  server: {
    androidScheme: 'https',
    cleartext: true,
    // 开发时：指向本地开发服务器
    // 生产时：Android 会使用内置的 Next.js standalone 服务器
    url: process.env.CAPACITOR_SERVER_URL || 'http://10.0.2.2:3000',
    // 允许在应用内加载任何 URL
    allowNavigation: ['*.*'],
  },
  android: {
    buildOptions: {
      keystorePath: process.env.ANDROID_KEYSTORE_PATH,
      keystorePassword: process.env.ANDROID_KEYSTORE_PASSWORD,
      keystoreAlias: process.env.ANDROID_KEYSTORE_ALIAS,
      keystoreAliasPassword: process.env.ANDROID_KEYSTORE_ALIAS_PASSWORD,
    },
    // 允许 HTTP（用于本地开发）
    allowMixedContent: true,
  },
  ios: {
    scheme: 'WordsAI'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true
    }
  }
};

export default config;
