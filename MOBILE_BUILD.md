# WordsAI 移动应用构建指南

## 项目信息

- **应用名称**: WordsAI
- **包名**: com.wordsai.app
- **框架**: Next.js + Capacitor
- **支持平台**: Android, iOS

## 开发环境要求

### Android 开发
- Android Studio (推荐最新版)
- JDK 17 或更高
- Android SDK (API Level 33+)
- Gradle 8.0+

### iOS 开发 (仅 Mac)
- Xcode 15.0+
- CocoaPods
- Apple 开发者账号

## 开发模式

### 启动开发服务器
```bash
npm run dev
```

### 在 Android 模拟器/真机上运行
```bash
# 1. 启动开发服务器
npm run dev

# 2. 在另一个终端，设置本地服务器 IP 地址
# Windows: ipconfig
# Mac/Linux: ifconfig

# 3. 设置环境变量
set CAPACITOR_SERVER_URL=http://YOUR_IP:3000

# 4. 同步并运行
npm run cap:sync:android
npx cap run android
```

## 生产构建

### Android Debug APK (测试版)
```bash
npm run android:build
```
输出位置: `android/app/build/outputs/apk/debug/app-debug.apk`

### Android Release APK (发布版)

#### 1. 生成签名密钥
```bash
keytool -genkey -v -keystore wordsai-release.keystore -alias wordsai -keyalg RSA -keysize 2048 -validity 10000
```

#### 2. 配置签名
将以下环境变量添加到系统或 `.env.local`:
```bash
ANDROID_KEYSTORE_PATH=/path/to/wordsai-release.keystore
ANDROID_KEYSTORE_PASSWORD=your_keystore_password
ANDROID_KEYSTORE_ALIAS=wordsai
ANDROID_KEYSTORE_ALIAS_PASSWORD=your_alias_password
```

#### 3. 构建发布版
```bash
npm run android:release
```
输出位置: `android/app/build/outputs/apk/release/app-release.apk`

## 功能检查清单

### 核心功能
- [x] 用户登录/注册
- [x] 添加单词
- [x] AI 聊天
- [x] 声纹验证 (需要麦克风权限)
- [x] 艾宾浩斯单词本
- [x] 白名单训练
- [x] 手写练习
- [x] 学习统计
- [x] 会员订阅
- [x] 兑换码系统
- [x] 支付系统

### Android 权限
- [x] INTERNET - 网络访问
- [x] RECORD_AUDIO - 声纹验证
- [x] MODIFY_AUDIO_SETTINGS - 音频设置
- [x] ACCESS_NETWORK_STATE - 网络状态检查
- [x] WRITE_EXTERNAL_STORAGE - 保存学习数据
- [x] READ_EXTERNAL_STORAGE - 读取学习数据

## 部署到应用商店

### Google Play Store

1. **生成签名的 APK 或 AAB**
   ```bash
   cd android
   ./gradlew bundleRelease
   ```
   输出: `app/build/outputs/bundle/release/app-release.aab`

2. **创建 Google Play 开发者账号**
   - 访问 https://play.google.com/console
   - 支付 $25 注册费

3. **上传应用**
   - 创建新应用
   - 填写应用信息
   - 上传 AAB 文件
   - 配置商店列表
   - 提交审核

### Apple App Store (仅 Mac)

1. **配置签名和证书**
   ```bash
   npx cap sync ios
   npx cap open ios
   ```
   在 Xcode 中配置签名证书

2. **构建 Archive**
   - Product > Archive
   - 上传到 App Store Connect

3. **提交审核**
   - 访问 https://appstoreconnect.apple.com
   - 创建新应用
   - 填写应用信息
   - 提交审核

## 常见问题

### Q: 应用无法连接到服务器？
A: 检查 `capacitor.config.ts` 中的 `server.url` 配置，确保指向正确的服务器地址。

### Q: 声纹验证不工作？
A: 确保已在 AndroidManifest.xml 中添加了 `RECORD_AUDIO` 权限，并在应用运行时授予了权限。

### Q: 构建失败？
A:
1. 清理构建缓存: `cd android && ./gradlew clean`
2. 删除 `.gradle` 文件夹
3. 重新同步: `npm run cap:sync:android`

### Q: 应用白屏？
A: 检查 Next.js 开发服务器是否正常运行，确保 `CAPACITOR_SERVER_URL` 设置正确。

## 文件结构

```
with-supabase-app/
├── android/              # Android 原生项目
├── ios/                  # iOS 原生项目 (需要 Mac)
├── public/               # 静态资源
│   └── index.html       # Capacitor 入口
├── app/                  # Next.js 页面
├── components/           # React 组件
├── lib/                  # 工具函数
├── capacitor.config.ts   # Capacitor 配置
└── package.json          # 项目配置
```
