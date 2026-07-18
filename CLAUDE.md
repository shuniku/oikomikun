# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

HIIT（高強度インターバルトレーニング）用のブラウザタイマーアプリ。詳細な要件・画面仕様・技術仕様は **SPEC.md** に定義されており、変更時は必ず SPEC.md との整合を保つこと。

最重要制約: **完全オフライン動作**（SPEC.md N-01）。ビルドツール・フレームワーク・外部依存（CDN、フォント、画像、音声ファイル）は一切使わない Vanilla JS。`index.html` を `file://` で開くだけで動作しなければならない。

## デプロイ

GitHub Pages で公開する（SPEC.md §6）。ビルド工程がないため、リポジトリルートをそのまま配信する。公開後もオフライン動作（`file://`）の要件は維持する — Pages はあくまで配布手段であり、外部リソース参照を追加してよい理由にはならない。アセットのパスは必ず相対パス（`css/style.css` 形式）で書き、絶対パス（`/css/...`）を使わない（Pages のプロジェクトサイトは `/<リポジトリ名>/` 配下で配信されるため）。

## コマンド

package.json は存在しない。ビルド・lint 工程はない。

```bash
# 全テスト実行（リポジトリルートで実行。test/ ディレクトリを自動検出する）
node --test

# 単一テストファイル
node --test test/timer.test.js

# 名前でテストを絞り込み
node --test --test-name-pattern="buildSchedule" test/timer.test.js
```

UI（app.js）は自動テスト対象外で、ブラウザでの手動確認（SPEC.md §5 の確認項目）とする。

## アーキテクチャ

ロジックと UI を厳格に分離した 2 層構成:

- **js/timer.js** — コアロジック。純粋関数のみ・イミュータブル・DOM 非依存。状態遷移は `advance(schedule, state, deltaMs)` が新しい state オブジェクトを返す形で行う。UMD 形式でエクスポートし、ブラウザでは `window.HiitTimer`、Node.js では `require('../js/timer.js')` として同一コードを共有する（`file://` では ES Modules が CORS で動かないための設計）。
- **js/app.js** — UI 制御・Web Audio API による音声合成・Wake Lock・localStorage。タイマーの計算は一切持たず、すべて `HiitTimer` に委譲する。IIFE で包み、`index.html` から通常の `<script>` タグで timer.js → app.js の順に読み込む。

時間管理の要点（SPEC.md N-04）: 残り時間は `setInterval` のティック回数ではなく `performance.now()` の差分から算出する。バックグラウンドでタブが間引かれても、復帰時に `advance` が余剰時間をフェーズをまたいで繰り越すことで正しい残り時間に追いつく。

## 実装ルール

- timer.js に DOM・副作用・可変状態を持ち込まない。新しいロジックは純粋関数として timer.js に追加し、test/timer.test.js にテストを書く（AAA パターン）。
- app.js 内でも timer.js の state は直接変更せず、常に `advance` 等の戻り値で置き換える。
- 設定値のバリデーション範囲（CONFIG_LIMITS）を変更する場合は、SPEC.md §2.3、index.html の input 属性（min/max）、timer.js の三箇所を同期させる。
- プリセットの追加・変更は timer.js の `PRESETS` 配列のみで完結する（ボタンは app.js が動的生成）。ただし SPEC.md §3.1 のプリセット一覧も同期させる。
- 音声は Web Audio API の OscillatorNode で合成する。`AudioContext` はユーザー操作（スタートボタン）を起点に生成する（自動再生制限対策）。
- UI 文言・コメントは日本語。
