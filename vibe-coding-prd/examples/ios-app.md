# 示例 2：iOS App — 每日心情打卡

> 这是一份完整的 vibe coding PRD 示例（约 200 行），展示 iOS 原生 App 的 5 模块写法。
> 用 SwiftUI + SwiftData，自用 + 1 位家人，工期 1 周。
> 通过 17 项自查（17/17 ✅）。

---

# Mood Daily PRD（v0.1）

| 项目代号 | mood-daily |
|---|---|
| 文档版本 | v0.1 |
| 最后更新 | 2026-05-04 |
| 当前阶段 | 设计中 |

---

## C — Context

- **一句话定位**：让我每天用 5 个 emoji 之一记录心情的极简 iOS 应用
- **平台**：SwiftUI 5 + iOS 17+ + Xcode 15 + TestFlight
- **用户**：自用 1 人 + 家人 1 人（共 2 人，TestFlight 邀请）
- **工期**：1 周（每天约 1 小时）
- **参考产品**：Daylio（功能太重），目标做一个"只保留打卡"的版本

---

## S — Scope

### v0.1 必做（MUST）

- 用户能够每天选 1 个 emoji 记录心情（5 选 1：😄😊😐😔😢）
- 用户能够看到日历视图，每个有打卡的日期显示对应 emoji
- 用户能够点击某个日期查看当天的 emoji
- 用户能够补打卡（最多回补 3 天前）
- 用户能够导出最近 30 天数据为 .json 文件

### v0.1 不做（MUST NOT）

- ❌ Apple Pay / 订阅，原因：自用免费
- ❌ iCloud 同步，原因：v0.2 再加
- ❌ 文字日记 / 配图，原因：本工具就要"极简，5 秒打完卡"
- ❌ 多种心情标签 / 自定义 emoji，原因：5 个固定 emoji 已够覆盖
- ❌ 推送通知 / 提醒，原因：v0.2 再考虑
- ❌ 数据可视化图表，原因：v0.2 加趋势图

### v0.2 计划（LATER）

- iCloud 同步（CloudKit）
- 每日 22:00 推送提醒
- 月度心情趋势图
- 每天补打卡限制延长到 7 天

### v0.3 远期（IDEAS）

- Apple Watch 一秒打卡
- 心情数据按月导出 PDF

---

## P — Specification

### P.1 视觉规范

- **背景色（亮色模式）**：`Color(.systemBackground)`
- **背景色（暗色模式）**：`Color(.systemBackground)`（自动跟随系统）
- **主色**：`.tint(.blue)`（系统蓝）
- **emoji 选择按钮**：圆形，60x60pt，`.background(Color(.secondarySystemBackground))`
- **emoji 字号**：`.font(.system(size: 40))`
- **日历单元格 emoji 字号**：`.font(.system(size: 22))`
- **字体**：San Francisco（系统默认）
- **圆角**：卡片 `RoundedRectangle(cornerRadius: 16)`，按钮 `Capsule()`
- **间距**：`.padding()` 默认 + 关键区块 `.padding(.vertical, 24)`

### P.2 行为规范

- App 启动 → 显示「今日打卡」页（如已打卡则显示已选 emoji，可改 1 次）
- 点击 5 个 emoji 之一 → 触觉反馈（`.haptic(.light)`） + 立即保存 + 弹出 1.5s 确认 toast「已记录」
- 切换 Tab 到「日历」 → 显示当月日历，有打卡的日期显示 emoji
- 点击日历某天（≤ 3 天前）→ 弹出"为这天补打卡"浮窗
- 点击日历某天（> 3 天前 + 无打卡）→ 浮窗显示"超出补打卡范围"
- 「设置」页 → 「导出数据」按钮 → 调系统分享面板，分享 .json 文件
- App 退到后台再打开 → 数据保持，不重置

### P.3 数据规范

```swift
@Model
final class MoodEntry {
    @Attribute(.unique) var date: Date    // 日期，年月日精度
    var emoji: String                      // 5 选 1: 😄 😊 😐 😔 😢
    var createdAt: Date
    var updatedAt: Date
}

enum Mood: String, CaseIterable {
    case happy = "😄"
    case content = "😊"
    case neutral = "😐"
    case sad = "😔"
    case crying = "😢"
}

// 业务规则：
// - 每个 date 最多一条记录（unique 约束）
// - 补打卡范围：今天 - 3 天
// - 已打卡可改 emoji（同 date 覆盖）
```

- 持久化：**SwiftData**（不用 Core Data）
- 数据迁移策略：v0.1 不做版本管理（v0.2 加 schema migration）

### P.4 技术规范

- **框架**：SwiftUI 5（不用 UIKit）
- **持久化**：SwiftData（不用 Core Data / Realm / SQLite）
- **不用**：Combine（用 `@Observable` 即可）/ ReactiveSwift / RxSwift
- **不用**：第三方 UI 库（如 SwiftUIX）
- **测试**：v0.1 不写单元测试
- **部署**：TestFlight（不上 App Store）
- **文件结构**：

```
MoodDaily/
├── MoodDailyApp.swift          # 入口
├── ContentView.swift           # 主 TabView
├── Views/
│   ├── TodayView.swift         # 今日打卡页
│   ├── CalendarView.swift      # 日历页
│   └── SettingsView.swift      # 设置页
├── Models/
│   └── MoodEntry.swift         # SwiftData 模型
├── ViewModels/
│   └── MoodStore.swift         # @Observable 状态
└── Resources/
    └── Assets.xcassets
```

---

## A — Acceptance

### 功能验收

- [ ] 5 个 emoji 都能正常点击 + 保存
- [ ] 同一天打卡两次会覆盖第一次（不会出现两条）
- [ ] 日历正确显示当月已打卡的 emoji
- [ ] 补打卡功能：3 天前可补，4 天前提示超范围
- [ ] 导出 .json 文件可在 Files 中正常打开

### 视觉验收

- [ ] emoji 在日历单元格中居中、不被截断
- [ ] 暗色模式下所有文字可读
- [ ] iPhone 15 Pro（6.1 寸）和 iPhone SE（4.7 寸）布局都正常

### 异常验收

- [ ] 数据库初始化失败时显示友好错误（不是白屏）
- [ ] 导出失败时弹出 alert 而非 crash

### 跨设备验收

- [ ] iPhone 15 Pro 模拟器跑通
- [ ] iPhone SE 模拟器跑通
- [ ] 真机（iPhone 12 / iOS 17）通过 TestFlight 安装并运行
- [ ] 1 位家人通过 TestFlight 邀请安装成功

---

## G — Guardrails

### 禁止事项

- ❌ **不要换 SwiftData 为 Core Data** / 原因：SwiftData 已够用且代码更少
- ❌ **不要加 iCloud 同步** / 原因：v0.1 范围外，v0.2 单独做
- ❌ **不要用 UIKit 包装** / 原因：保持纯 SwiftUI 简洁
- ❌ **不要支持 iOS 16 及以下** / 原因：SwiftData 仅 iOS 17+
- ❌ **不要让 emoji 可自定义** / 原因：5 选 1 是产品决策核心
- ❌ **不要把数据上传到任何服务器** / 原因：隐私第一

### 决策时机表

| 场景 | 必问用户 / 可自决 |
|---|---|
| 改 5 个 emoji 字符 | 必问 |
| 改补打卡天数（3 天） | 必问 |
| 改主色（系统蓝） | 必问 |
| 改文件结构 / 拆 View 组件 | 自决 |
| 改 Swift 函数命名 | 自决 |
| 加 SPM 依赖 | 必问 |
| 改最低 iOS 版本要求 | 必问 |
| 改 SwiftData Schema | 必问 |
