# 追い込みくん

筋トレ（HIIT: 高強度インターバルトレーニング）用のタイマーアプリ。ブラウザだけで動作し、一度開けばネットワーク接続なしで完全に動作します。

**👉 使う: https://shuniku.github.io/oikomikun/**

## 特徴

- **準備 → 運動 → 休憩** のフェーズを自動遷移し、指定セット数を繰り返す
- プリセットをワンタップで適用（マイセット 240/180×6、タバタ 20/10×8、HIIT標準 30/15×10、スプリント 45/15×6）
- 各フェーズの秒数・セット数は自由に設定可能。設定は自動保存され次回起動時に復元
- フェーズ切替と残り3秒からのカウントダウンでビープ音（Web Audio API で合成・ON/OFF 可）
- タイマー動作中は画面をスリープさせない（Wake Lock API 対応ブラウザ）
- ジムの離れた場所からでも見える大型の残り時間表示と、フェーズごとの背景色（準備=青 / 運動=赤 / 休憩=緑）
- バックグラウンドでタブが間引かれても残り時間がずれない時刻ベースの計算
- スマートフォンは縦一列、PC・タブレット横向きは専用レイアウトで表示
- 表示言語を 日本語 / English / 中文 から切り替え可能（初回はブラウザ言語から自動判定）

## 使い方

上記 URL を開くだけです。スマートフォンならホーム画面に追加するとアプリのように使えます。

オフラインで使う場合は、リポジトリを取得して `index.html` をブラウザで直接開いても同じように動作します（ビルド不要・外部リソース参照なし）。

```bash
git clone https://github.com/shuniku/oikomikun.git
open oikomikun/index.html
```

## 開発

フレームワーク・ビルドツール・外部依存なしの Vanilla JS です。詳細な仕様は [SPEC.md](SPEC.md) を参照してください。

```
├── index.html           # エントリポイント
├── css/style.css        # スタイル
├── js/timer.js          # タイマーロジック（純粋関数のみ・DOM非依存）
├── js/app.js            # UI制御・音声・Wake Lock・localStorage
└── test/timer.test.js   # ロジックのユニットテスト
```

### テスト

ユニットテストは Node.js 組み込みのテストランナーで実行します。

```bash
node --test
```

UI の E2E テストは Playwright で実行します（初回のみセットアップが必要）。

```bash
npm install
npx playwright install chromium
npm run test:e2e
```

push すると GitHub Actions で両方が自動実行されます。

### デプロイ

`main` ブランチにプッシュすると GitHub Pages（リポジトリルート配信）へ自動反映されます。

## ライセンス

[MIT License](LICENSE)
