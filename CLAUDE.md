# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

HIIT（高強度インターバルトレーニング）用のブラウザタイマーアプリ。詳細な要件・画面仕様・技術仕様は **SPEC.md** に定義されており、変更時は必ず SPEC.md との整合を保つこと。

最重要制約: **完全オフライン動作**（SPEC.md N-01）。ビルドツール・フレームワーク・外部依存（CDN、フォント、画像、音声ファイル）は一切使わない Vanilla JS。`index.html` を `file://` で開くだけで動作しなければならない。

## デプロイ

GitHub Pages で公開する（SPEC.md §6）。ビルド工程がないため、リポジトリルートをそのまま配信する。公開後もオフライン動作（`file://`）の要件は維持する — Pages はあくまで配布手段であり、外部リソース参照を追加してよい理由にはならない。アセットのパスは必ず相対パス（`css/style.css` 形式）で書き、絶対パス（`/css/...`）を使わない（Pages のプロジェクトサイトは `/<リポジトリ名>/` 配下で配信されるため）。例外は index.html の OGP メタタグ（og:url / og:image）のみ — クローラー用メタデータなのでページの動作に影響しない絶対 URL を許容する。

PWA 対応（manifest.webmanifest + sw.js）。Service Worker はネットワーク優先・キャッシュフォールバックなので、デプロイのたびにキャッシュバージョンを上げる必要はない。ただし**配信アセットの追加・削除・改名時は sw.js の ASSETS 一覧を同期し、CACHE_NAME（oikomikun-vN）を上げる**こと。

## コマンド

ビルド・lint 工程はない。package.json は E2E テスト（Playwright）のためだけに存在し、アプリ本体は依存ゼロのまま。

```bash
# ユニットテスト（リポジトリルートで実行。test/ ディレクトリを自動検出する）
node --test

# 単一テストファイル / 名前で絞り込み
node --test test/timer.test.js
node --test --test-name-pattern="buildSchedule" test/timer.test.js

# E2E テスト（Playwright。初回は npm install と npx playwright install chromium が必要）
npm run test:e2e

# E2E を名前で絞り込み
npx playwright test -g "リセット"
```

E2E のスペックは `e2e/` に置く。`test/` 配下に置くと `node --test` が Playwright のファイルを実行しようとして失敗するため、この分離は必須。E2E 用の静的サーバーは `e2e/serve.mjs`（依存ゼロ、Playwright の webServer が自動起動）。

push すると GitHub Actions（.github/workflows/test.yml）でユニット・E2E 両方が走る。

## アーキテクチャ

ロジック・文言・UI を分離した 3 層構成:

- **js/timer.js** — コアロジック。純粋関数のみ・イミュータブル・DOM 非依存・**言語非依存**。状態遷移は `advance(schedule, state, deltaMs)` が新しい state オブジェクトを返す形で行う。`validateConfig` のエラーは構造化データ `[{ field, min, max }]` で返す（文言化は表示層の仕事）。UMD 形式でエクスポートし、ブラウザでは `window.HiitTimer`、Node.js では `require('../js/timer.js')` として同一コードを共有する（`file://` では ES Modules が CORS で動かないための設計）。
- **js/i18n.js** — 3 言語（ja / en / zh）の UI 文言辞書 `MESSAGES` と整形ヘルパー（`format` / `detectLanguage` / `presetLabel`）。timer.js と同じ UMD 形式（`window.HiitI18n`）。
- **js/app.js** — UI 制御・Web Audio API による音声合成・Wake Lock・localStorage・SW 登録・言語切替。タイマーの計算は `HiitTimer` に、文言は `HiitI18n` に委譲する。IIFE で包み、`index.html` から通常の `<script>` タグで timer.js → i18n.js → app.js の順に読み込む。

時間管理の要点（SPEC.md N-04）: 残り時間は `setInterval` のティック回数ではなく `performance.now()` の差分から算出する。バックグラウンドでタブが間引かれても、復帰時に `advance` が余剰時間をフェーズをまたいで繰り越すことで正しい残り時間に追いつく。

## 実装ルール

- timer.js に DOM・副作用・可変状態を持ち込まない。新しいロジックは純粋関数として timer.js に追加し、test/timer.test.js にテストを書く（AAA パターン）。
- app.js 内でも timer.js の state は直接変更せず、常に `advance` 等の戻り値で置き換える。
- 設定値のバリデーション範囲（CONFIG_LIMITS）を変更する場合は、SPEC.md §2.3、index.html の input 属性（min/max）、timer.js の三箇所を同期させる。
- プリセットの追加・変更は timer.js の `PRESETS` 配列（id と config）と i18n.js の全言語の `presetNames` の両方を更新する（ボタンは app.js が動的生成）。SPEC.md §3.1 のプリセット一覧も同期させる。マイセット（id: `personal`）は例外で、timer.js の値は既定値にすぎず、ユーザー保存値（localStorage の `personalConfig`）が表示時に優先される（app.js の `getPresets()`）。
- `loadSettings()` の返り値にフィールドを足すときは、**localStorage が空の場合と JSON 破損時の両方の早期 return にも必ず同じフィールドを追加する**（追加漏れで初回訪問時のみ undefined になるバグが実際に起きた）。
- UI 文言を追加・変更するときは i18n.js の **3 言語すべて**の辞書を更新する。キー構造の不一致は test/i18n.test.js が検出する。静的 HTML の文言は `data-i18n` 属性でキーを紐づける。
- 音声は Web Audio API の OscillatorNode で合成する。`AudioContext` はユーザー操作（スタートボタン）を起点に生成する（自動再生制限対策）。
- UI 文言・コメントは日本語。
