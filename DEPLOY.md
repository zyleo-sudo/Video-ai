# 部署到 Vercel 指南

> 免费、自动更新、国内访问快

## 前提条件

- 注册 GitHub 账号: https://github.com
- 注册 Vercel 账号: https://vercel.com (用GitHub登录)

## 步骤 1: 创建 GitHub 仓库

在 GitHub 上创建新仓库，命名为 `video-ai`

```bash
# 在项目目录执行以下命令

git init

git add .

git commit -m "Initial commit"

git remote add origin https://github.com/你的用户名/video-ai.git

git push -u origin main
```

## 步骤 2: 连接 Vercel

1. 访问 https://vercel.com
2. 点击 "Add New Project"
3. 选择你的 `video-ai` 仓库
4. 点击 "Deploy"

等待约 1-2 分钟，部署完成！

## 步骤 3: 获得访问链接

部署成功后，Vercel会给你类似这样的链接：

```
https://video-ai-abc123.vercel.app
```

**把这个链接发给朋友即可！**

## 如何更新（重要！）

当你修改代码后，朋友会自动获得最新版：

```bash
# 修改代码后执行
git add .
git commit -m "更新说明"
git push origin main
```

**Vercel会自动重新部署（约30秒）**

朋友刷新页面就能看到新版本！

## 朋友如何使用

1. 打开你分享的链接
2. 在设置中填写自己的 API 密钥
3. 开始使用

**注意：API密钥保存在浏览器本地，不会共享给别人**

## 免费额度

- 流量：100GB/月（足够几十个人用）
- 构建次数：无限制
- 完全免费，无需信用卡

## 自定义域名（可选）

如果你想用更好记的域名：

1. 购买域名（阿里云/腾讯云，约50-70元/年）
2. 在 Vercel 项目设置中添加域名
3. 按提示配置 DNS

## 常见问题

**Q: 朋友需要下载什么吗？**  
A: 不需要！直接在浏览器打开链接即可

**Q: 我更新了代码，朋友需要重新下载吗？**  
A: 不需要！刷新页面自动获得最新版

**Q: 朋友能看到我的API密钥吗？**  
A: 不能！每个人的密钥都存在自己浏览器里

**Q: 国内访问慢吗？**  
A: 不慢！Vercel在国内有CDN节点，速度很快

## 技术支持

如遇到问题，检查：
1. 是否正确推送到GitHub
2. Vercel部署日志是否有错误
3. 浏览器控制台(F12)是否有报错
