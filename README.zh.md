[English](README.md) | [日本語](README.ja.md) | 中文

# 追い込みくん（Oikomi-kun）

一款用于 HIIT（高强度间歇训练）的浏览器计时器应用。只需在浏览器中打开一次，之后无需联网即可完全离线使用。

**👉 立即使用：https://shuniku.github.io/oikomikun/**

## 特点

- 按 **准备 → 运动 → 休息** 阶段自动切换，并循环执行设定的组数
- 一键应用预设（我的设置、Tabata 20/10×8、标准 HIIT 30/15×10、冲刺 45/15×6）
- "我的设置"是一个可随时用当前参数覆盖保存的个人预设
- 每个阶段的时长与组数均可自由设置，设置会自动保存并在下次启动时恢复
- 阶段切换及倒数最后 3 秒时会发出提示音（通过 Web Audio API 合成，可开关）
- 计时运行期间屏幕不会自动熄灭（在支持 Wake Lock API 的浏览器中）
- 剩余时间以大字号显示，即使在健身房较远处也能看清；不同阶段配有不同背景色（准备=蓝色 / 运动=红色 / 休息=绿色）
- 基于时间戳计算剩余时间，即使标签页在后台被节流也不会产生误差
- 手机端为单列布局，PC 及横屏平板则采用专用布局
- 可在 日本語 / English / 中文 之间切换界面语言（首次访问会根据浏览器语言自动判断）
- 支持 PWA，添加到主屏幕后即可像原生应用一样启动，离线也可使用

## 使用方法

打开上方链接即可。在手机上可将其添加到主屏幕，像原生应用一样使用。

若需离线使用，克隆本仓库后直接在浏览器中打开 `index.html` 也能以相同方式运行（无需构建、不依赖任何外部资源）。

```bash
git clone https://github.com/shuniku/oikomikun.git
open oikomikun/index.html
```

## 开发

采用不依赖任何框架、构建工具或外部依赖的原生 Vanilla JS 实现。详细规格请参见 [SPEC.md](SPEC.md)（日文）。

```
├── index.html              # 入口文件
├── manifest.webmanifest    # PWA 清单
├── sw.js                   # Service Worker
├── css/style.css           # 样式
├── js/timer.js             # 计时器逻辑（纯函数、不依赖 DOM、与语言无关）
├── js/i18n.js              # 多语言支持（ja / en / zh 文案字典）
├── js/app.js               # UI 控制、音频、Wake Lock、localStorage、语言切换
├── test/timer.test.js      # 计时器逻辑的单元测试
├── test/i18n.test.js       # 多语言字典的单元测试
└── e2e/                    # Playwright 端到端测试
```

### 测试

单元测试使用 Node.js 内置的测试运行器执行。

```bash
node --test
```

UI 端到端测试使用 Playwright 执行（首次需要安装）。

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

push 后 GitHub Actions 会自动运行以上两种测试。

### 部署

推送到 `main` 分支后会自动部署到 GitHub Pages（从仓库根目录提供服务）。

## 许可证

[MIT License](LICENSE)
