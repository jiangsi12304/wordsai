# WordsAI - 快速部署指南

## 📋 部署前检查清单

### 1. 环境变量确认

确保 `.env.local` 包含以下变量：
```bash
NEXT_PUBLIC_SUPABASE_URL=xxx
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=xxx
ADMIN_SECRET_KEY=xxx
RESEND_API_KEY=xxx
RESEND_FROM_EMAIL=xxx
```

### 2. 构建测试

```bash
npm run build
```

确认没有错误后再继续部署。

---

## 🚀 方式一：Vercel 部署 (推荐)

### 步骤 1: 登录 Vercel

```bash
vercel login
```

按提示在浏览器中完成登录。

### 步骤 2: 部署

```bash
# 从项目目录执行
vercel --prod
```

部署完成后，Vercel 会返回一个 URL，例如：
```
https://wordsai-xxx.vercel.app
```

### 步骤 3: 更新 Capacitor 配置

编辑 `capacitor.config.ts`，将 `server.url` 更新为你的 Vercel URL：

```typescript
server: {
  androidScheme: 'https',
  cleartext: true,
  url: 'https://wordsai-xxx.vercel.app',  // 替换为你的实际 URL
  allowNavigation: ['*.*'],
},
```

### 步骤 4: 同步并构建 APK

```bash
# 同步 Android 项目
npm run cap:sync:android

# 打开 Android Studio
npm run cap:open:android
```

在 Android Studio 中：
1. 等待 Gradle 同步完成
2. 点击 Build → Build Bundle(s) / APK(s) → Build APK(s)
3. 生成的 APK 位于: `app/build/outputs/apk/debug/app-debug.apk`

---

## 📱 方式二：Android Studio 构建 APK

### 前置要求

1. **安装 JDK 17**
   - 下载: https://adoptium.net/temurin/releases/?version=17
   - 安装后设置环境变量:
     ```powershell
     setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.2"
     ```

2. **安装 Android Studio**
   - 下载: https://developer.android.com/studio
   - 安装时勾选 "Android SDK Platform-Tools"
   - 安装 Android SDK 33+

### 构建步骤

```bash
# 1. 进入 Android 项目目录
cd android

# 2. 清理之前的构建
./gradlew clean

# 3. 构建 Debug APK
./gradlew assembleDebug

# 4. APK 输出位置
# app\build\outputs\apk\debug\app-debug.apk
```

### 在 Android Studio 中操作

1. 打开项目:
   ```bash
   npm run cap:open:android
   ```

2. 等待 Gradle 同步完成

3. 点击菜单: Build → Build Bundle(s) / APK(s) → Build APK(s)

4. 构建完成后点击通知中的 "locate" 查找 APK

---

## 📱 方式三：使用 Gradlew 直接构建

如果已安装 JDK 和 Android SDK：

```bash
# 一键构建脚本
cd android
gradlew.bat assembleDebug
```

输出: `android\app\build\outputs\apk\debug\app-debug.apk`

---

## 🔐 构建 Release APK (签名版本)

### 1. 生成签名密钥

```bash
keytool -genkeypair -v -keystore wordsai-release.keystore \
  -alias wordsai -keyalg RSA -keysize 2048 -validity 10000 \
  -storepass YOUR_PASSWORD -keypass YOUR_PASSWORD \
  -dname "CN=WordsAI, OU=Development, O=WordsAI, L=City, ST=State, C=CN"
```

### 2. 创建 keystore.properties

在 `android/` 目录下创建 `keystore.properties`:

```properties
storeFile=../wordsai-release.keystore
storePassword=YOUR_PASSWORD
keyAlias=wordsai
keyPassword=YOUR_PASSWORD
```

### 3. 修改 build.gradle

确保 `android/app/build.gradle` 包含签名配置。

### 4. 构建 Release APK

```bash
cd android
./gradlew assembleRelease
```

输出: `android/app/build/outputs/apk/release/app-release.apk`

---

## 📤 上传到 Google Play

### 1. 准备材料

- 应用图标 (512x512 PNG)
- 应用截图 (至少 2 张)
- 应用描述
- 隐私政策 URL

### 2. 创建开发者账号

1. 访问 https://play.google.com/console
2. 支付 $25 (一次性)
3. 完成账号设置

### 3. 创建应用

1. 点击"创建应用"
2. 填写应用信息
3. 上传 AAB 文件:
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   输出: `app/build/outputs/bundle/release/app-release.aab`

---

## 🛠️ 当前配置总结

### 应用信息
```
名称: WordsAI
包名: com.wordsai.app
版本: 1.0.0
```

### 服务器配置
```
开发模式: http://10.0.2.2:3000 (本地)
生产模式: https://your-vercel-app.vercel.app
```

### 下一步操作

1. **立即执行**: `vercel login` 登录 Vercel
2. **部署**: `vercel --prod` 部署到 Vercel
3. **更新配置**: 修改 `capacitor.config.ts` 中的 URL
4. **同步**: `npm run cap:sync:android`
5. **构建**: 在 Android Studio 中构建 APK
