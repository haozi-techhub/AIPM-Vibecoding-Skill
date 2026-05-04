# 示例 1：Web 工具 — 番茄工作法计时器

> 这是一份完整的 vibe coding PRD 示例（约 200 行），展示 Web 工具类项目的 5 模块写法。
> 用 Next.js + Vercel 技术栈，单人自用，工期 1 天。
> 通过 17 项自查（17/17 ✅）。

---

# Pomodoro Timer PRD（v0.1）

| 项目代号 | pomodoro-timer |
|---|---|
| 文档版本 | v0.1 |
| 最后更新 | 2026-05-04 |
| 当前阶段 | 设计中 |

---

## C — Context

- **一句话定位**：让我专注工作的极简番茄钟网页（25 分钟工作 + 5 分钟休息循环）
- **平台**：Next.js 14 App Router + Vercel
- **用户**：自用 1 人，不开放
- **工期**：1 天内做完 v0.1
- **参考产品**：tomato-timer.com（功能参考），但要更极简

---

## S — Scope

### v0.1 必做（MUST）

- 用户能够点击"开始"启动 25 分钟倒计时
- 用户能够看到剩余时间（mm:ss 格式）
- 用户能够暂停 / 继续 / 重置计时器
- 用户能够在 25 分钟结束时听到提示音
- 用户能够看到当日完成的番茄数（重启后归零）
- 用户能够切换"工作（25 分）"和"休息（5 分）"两种模式

### v0.1 不做（MUST NOT）

- ❌ 用户登录系统，原因：单设备自用
- ❌ 历史统计 / 周报 / 月报，原因：v0.2 再说
- ❌ 自定义时长（25 分钟写死），原因：MVP 先固化最常用配置
- ❌ 任务列表 / TODO 集成，原因：超出本工具定位
- ❌ 移动端通知 / PWA，原因：v0.2 再考虑
- ❌ 暗色模式，原因：v0.2 再加

### v0.2 计划（LATER）

- 自定义工作 / 休息时长
- 历史番茄数统计（7 天内）
- 暗色模式
- PWA 支持

### v0.3 远期（IDEAS）

- 多任务联动
- 团队共享番茄会话

---

## P — Specification

### P.1 视觉规范

- **主色（工作模式）**：`#dc2626`（番茄红）
- **主色（休息模式）**：`#16a34a`（休息绿）
- **背景**：`#fafafa`
- **主文字**：`#171717`
- **次文字**：`#737373`
- **字体**：`"Inter", "PingFang SC", system-ui, sans-serif`
- **倒计时字号**：`128px`，font-weight: 200，tabular-nums
- **按钮字号**：`16px`，font-weight: 500
- **圆角**：按钮 `8px`，卡片 `16px`
- **间距**：主体居中 `max-w-md`，垂直间距 `gap-8`

### P.2 行为规范

- 点击「开始」按钮 → 倒计时启动，按钮变为「暂停」
- 点击「暂停」按钮 → 倒计时停止，按钮变为「继续」
- 点击「重置」按钮 → 弹出确认浮窗"确定重置吗？"，确认后倒计时归零
- 倒计时到 00:00 → 播放提示音 + 自动切换到对方模式（工作 → 休息 / 休息 → 工作）+ 工作模式完成时番茄数 +1
- 切换"工作 / 休息" Tab → 立即切换主题色 + 重置倒计时为对应时长
- 浏览器 Tab 切到后台 → 倒计时**继续运行**（用 `Date.now()` 计算而非 `setInterval`）
- 浏览器关闭 → 数据丢失（v0.1 不做持久化）
- 提示音失败（浏览器限制）→ 静默失败，不弹错误

### P.3 数据规范

```typescript
type Mode = 'work' | 'rest';

interface TimerState {
  mode: Mode;
  startTimestamp: number | null;  // null = 未启动
  pausedAt: number | null;        // null = 未暂停
  pausedDuration: number;         // 累计暂停时长（毫秒）
  completedPomodoros: number;     // 当日完成数
}

const WORK_DURATION = 25 * 60 * 1000;  // 25 分钟，毫秒
const REST_DURATION = 5 * 60 * 1000;   // 5 分钟，毫秒
```

- 状态管理：React `useState` + `useEffect`，**不**用 Redux / Zustand
- 持久化：v0.1 **不**用 localStorage（页面刷新后状态丢失，作为已知限制）

### P.4 技术规范

- **框架**：Next.js 14 App Router + TypeScript
- **样式**：Tailwind CSS
- **音频**：原生 `Audio` API，提示音用 `/public/bell.mp3`（200KB 内）
- **部署**：Vercel
- **不用**：shadcn / Antd / Material-UI / 任何状态管理库 / 任何动画库
- **文件结构**：

```
pomodoro-timer/
├── app/
│   ├── layout.tsx
│   ├── page.tsx          # 主页面
│   └── globals.css
├── components/
│   ├── Timer.tsx         # 倒计时显示
│   ├── Controls.tsx      # 开始 / 暂停 / 重置
│   └── ModeSwitch.tsx    # 工作 / 休息切换
├── lib/
│   └── timer.ts          # 时间计算逻辑
├── public/
│   └── bell.mp3
└── package.json
```

---

## A — Acceptance

### 功能验收

- [ ] 点击「开始」后倒计时正常运行（用秒表对比误差 < 1s）
- [ ] 暂停后再继续，剩余时间正确（不会跳秒）
- [ ] 重置弹确认浮窗，确认后归零
- [ ] 工作 25 分钟到点自动切换到休息 5 分钟
- [ ] 切换 Tab 到后台 30 秒后回来，倒计时仍然正确
- [ ] 当日完成 3 个番茄后，刷新页面归零
- [ ] 切换模式时主题色立即变化（红 ↔ 绿）

### 视觉验收

- [ ] 倒计时数字使用 tabular-nums（数字不抖动）
- [ ] 工作模式背景偏红，休息模式偏绿
- [ ] 移动端（375px 宽）排版不溢出

### 异常验收

- [ ] 浏览器禁用音频时不显示报错
- [ ] 浏览器刷新页面后状态归零（无报错）
- [ ] 极端情况（连续点击开始/暂停 10 次）不卡死

### 跨平台验收

- [ ] Chrome 桌面正常
- [ ] Safari 桌面正常
- [ ] iOS Safari 移动端正常
- [ ] Vercel 部署后公网 URL 可访问

---

## G — Guardrails

### 禁止事项

- ❌ **不要换框架**（Next.js 14 + Tailwind）/ 原因：用户已熟悉这套组合
- ❌ **不要加状态管理库** / 原因：本项目状态简单，useState 足够
- ❌ **不要用 setInterval 做倒计时** / 原因：后台 tab 会暂停，用 Date.now() 计算
- ❌ **不要顺手加 PWA / Service Worker** / 原因：v0.1 范围外
- ❌ **不要把 bell.mp3 放成 base64 内联** / 原因：增加 HTML 体积

### 决策时机表

| 场景 | 必问用户 / 可自决 |
|---|---|
| 改主题色（红 / 绿） | 必问 |
| 改时长（25 / 5 分钟） | 必问 |
| 改提示音文件 | 必问 |
| 改文件结构 / 拆组件 | 自决 |
| 改变量名 | 自决 |
| 加 npm 依赖 | 必问 |
| 改 Tailwind 配置 | 必问 |
