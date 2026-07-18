# Provider routing

## 选择标准

仅当宿主原生能力同时满足以下条件时优先使用：

1. 能访问目标招聘网站搜索页和详情页。
2. 能复用用户已有登录态或在用户参与下完成登录。
3. 能读取完整 JD、职位名、公司、城市、薪资和来源 URL。
4. 能保证所有请求串行，并在每次请求完成后等待 30–33 秒。
5. 能在每条记录后写入本地断点。
6. 能识别验证码、403/429、登录失效和风控页面并立即停止。

缺少任一关键能力时使用 `opencli`。

## opencli 安装与连接

安装命令：

```bash
npm install -g @jackwener/opencli
```

安装前必须获得用户授权。安装后：

```bash
opencli doctor
opencli boss whoami -f json
opencli 51job --help
```

若 Browser Bridge 未连接，先重启本地守护进程一次：

```bash
opencli daemon restart
```

等待扩展重连后再次运行 `opencli doctor`。登录必须由用户在浏览器中完成；禁止读取或请求账号密码。

## 允许的 opencli 操作

- `boss whoami`
- `boss search`
- `boss detail`
- `51job search`
- `51job detail`

明确禁止 `greet`、`send`、`exchange`、`invite`、`batchgreet` 以及任何写操作。

## 原生能力断点协议

使用与内置抓取器相同的 `crawl-state.json` 关键字段：

- `completedSearches`
- `candidates`
- `attemptedDetails`
- `accepted`
- `rejected`
- `requestLog`
- `nextAllowedAt`
- `phase`
- `stopReason`

每次网络操作完成后记录开始时间、结束时间、来源、命令、标签、退出/页面状态和下一次允许请求时间。
