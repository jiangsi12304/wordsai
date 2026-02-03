# WordsAI - 生产环境部署指南

## 🚀 Vercel 部署 (推荐)

### 1. 安装 Vercel CLI

```bash
npm install -g vercel
```

### 2. 登录 Vercel

```bash
vercel login
```

### 3. 部署应用

```bash
# 从项目目录执行
cd with-supabase-app
vercel
```

### 4. 配置环境变量

在 Vercel 控制台中添加以下环境变量：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
ADMIN_SECRET_KEY=your_admin_secret
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=onboarding@resend.dev
```

### 5. 更新 Capacitor 配置

部署成功后，更新 `capacitor.config.ts`:

```typescript
const config: CapacitorConfig = {
  appId: 'com.wordsai.app',
  appName: 'WordsAI',
  webDir: 'public',
  server: {
    androidScheme: 'https',
    cleartext: true,
    // 生产环境 URL
    url: 'https://your-app.vercel.app',
    allowNavigation: ['*.*'],
  },
  // ... 其他配置
};
```

### 6. 同步并构建

```bash
npm run cap:sync:android
```

---

## 🖥️ 自建服务器部署 (Node.js)

### 1. 安装 PM2

```bash
npm install -g pm2
```

### 2. 构建应用

```bash
npm run build
```

### 3. 启动服务

```bash
# 使用 PM2 启动
pm2 start npm --name "wordsai" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

### 4. 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. 配置 SSL (Let's Encrypt)

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取 SSL 证书
sudo certbot --nginx -d your-domain.com
```

---

## 📱 Android APK 构建完整指南

### 步骤 1: 安装 JDK

#### Windows

1. 下载 JDK 17: https://adoptium.net/temurin/releases/?version=17
2. 安装到默认路径 (如 `C:\Program Files\Eclipse Adoptium\jdk-17.0.2`)
3. 设置环境变量:
   ```powershell
   setx JAVA_HOME "C:\Program Files\Eclipse Adoptium\jdk-17.0.2"
   setx PATH "%JAVA_HOME%\bin;%PATH%"
   ```
4. 重新打开命令行验证:
   ```bash
   java -version
   ```

#### 或使用 SDKMAN (推荐)

```bash
# 安装 SDKMAN (Windows 上使用 Git Bash)
curl -s "https://get.sdkman.io" | bash

# 安装 JDK
sdk install java 17.0.2-tem
sdk use java 17.0.2-tem
```

### 步骤 2: 安装 Android SDK

#### 选项 A: 使用 Android Studio

1. 下载 Android Studio: https://developer.android.com/studio
2. 安装并接受许可证
3. 安装 Android SDK Platform 33+
4. 安装 Android Build Tools

#### 选项 B: 命令行安装

```bash
# 使用 Homebrew (Mac/Linux)
brew install --cask android-platform-tools

# Windows: 下载 Command Line Tools
# https://developer.android.com/studio#command-tools
```

### 步骤 3: 构建 Debug APK

```bash
cd android

# 清理之前的构建
./gradlew clean

# 构建 Debug APK
./gradlew assembleDebug

# APK 输出位置
ls app/build/outputs/apk/debug/app-debug.apk
```

### 步骤 4: 安装到设备测试

```bash
# 连接手机 (启用 USB 调试)
adb devices

# 安装 APK
adb install app/build/outputs/apk/debug/app-debug.apk

# 或使用 Capacitor 直接运行
cd ..
npx cap run android
```

---

## 🔐 构建 Release APK (签名版本)

### 步骤 1: 生成签名密钥

```bash
keytool -genkey -v -keystore wordsai-release.keystore \
  -alias wordsai -keyalg RSA \
  -keysize 2048 -validity 10000
```

### 步骤 2: 配置签名

#### 方法 1: 使用环境变量

```bash
# Windows
set ANDROID_KEYSTORE_PATH=/path/to/wordsai-release.keystore
set ANDROID_KEYSTORE_PASSWORD=your_password
set ANDROID_KEYSTORE_ALIAS=wordsai
set ANDROID_KEYSTORE_ALIAS_PASSWORD=your_password
```

#### 方法 2: 创建 keystore.properties

创建 `android/keystore.properties`:
```properties
storeFile=../wordsai-release.keystore
storePassword=your_password
keyAlias=wordsai
keyPassword=your_password
```

### 步骤 3: 构建 Release APK

```bash
cd android

# 构建 Release APK
./gradlew assembleRelease

# 或构建 AAB (Google Play 需要)
./gradlew bundleRelease
```

输出位置:
- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB: `app/build/outputs/bundle/release/app-release.aab`

---

## 📱 上传到 Google Play

### 步骤 1: 创建开发者账号

1. 访问 https://play.google.com/console
2. 支付 $25 (一次性)
3. 完成账号设置

### 步骤 2: 创建应用

1. 点击"创建应用"
2. 填写应用信息:
   - 应用名称: WordsAI
   - 应用说明
   - 截图 (至少 2 张)
   - 图标 (512x512 PNG)

### 步骤 3: 上传 AAB 文件

1. 进入"发布" → "生产环境"
2. 创建新版本
3. 上传 `app-release.aab`
4. 填写版本说明

### 步骤 4: 提交审核

1. 完成内容评级
2. 完成隐私政策
3. 完成出口合规
4. 提交审核

---

## 🔧 常见问题

### Q: Gradle 构建失败?
A: 检查 JAVA_HOME 是否正确设置:
```bash
echo %JAVA_HOME%
java -version
```

### Q: 找不到 Android SDK?
A: 设置 ANDROID_HOME:
```bash
# Windows
setx ANDROID_HOME "C:\Users\YourName\AppData\Local\Android\Sdk"

# 添加到 PATH
setx PATH "%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\tools;%PATH%"
```

### Q: 签名失败?
A: 确保密钥文件路径正确，密码匹配:
```bash
keytool -list -v -keystore wordsai-release.keystore
```

### Q: 应用无法连接服务器?
A: 检查 `capacitor.config.ts` 中的 `server.url` 是否正确，确保服务器已部署。

---

## 📞 获取帮助

- Capacitor 文档: https://capacitorjs.com/docs
- Android 开发: https://developer.android.com/docs
- Vercel 部署: https://vercel.com/docs
