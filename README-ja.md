[English](./README.md)

# copylink-dev.user.js (UserScript)

このリポジトリは、[copylink-dev](https://github.com/wintorse/copylink-dev) を UserScript として利用できるようにしたものです。Chrome 拡張機能が使えないブラウザ（例: Safari）でも使用できます。ブラウザ拡張版のソースは git submodule として含まれています。

## copylink-dev との違い

- ショートカット設定は、トーストの「設定」ボタンを押して表示される設定パネルから行えます。
- 絵文字・カスタム Web サイト設定も同じ設定パネルで行えます。
- Chrome 拡張機能が使えないブラウザ（例: Safari）でも UserScript として利用できます。

## サブモジュール

このリポジトリは `copylink-dev` を git submodule として利用しています。

## リリースの自動反映

最新リリースは workflow により以下の Gist に自動反映されます。

- https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611

## インストール方法

### Chromium 系ブラウザ

1. Chrome 拡張機能の Tampermonkey をインストールする。
2. `chrome://extensions/` で Tampermonkey の詳細設定を開き、「ユーザースクリプトを許可する」を有効化する。
3. [https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js](https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js) を開く。
4. 表示される画面に従いインストールする。

### Safari

1. App Store で [Userscripts](https://apps.apple.com/jp/app/userscripts/id1463298887) をインストールする。
2. Safari のタブバーに表示されるアイコンをクリックし、"Open Extension Page" をクリックする。
3. 「+」ボタン → "New Remote" を選択し、次の URL を入力する: `https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js`
4. 右下の "Save" をクリックする。

## 更新方法

### Chromium 系ブラウザ

1. ブラウザで Tampermonkey のアイコンをクリックする。
2. 表示されたポップアップで「ユーティリティ」を選択し、「UserScript の更新を確認」をクリックする。
3. 表示に従い更新する。

### Safari

1. Safari のタブバーに表示されているアイコンをクリックし、"Open Extension Page" をクリックする。
2. copylink.dev を選択する（すでに選択されている場合は次へ）
3. 画面右上の更新ボタンを押下する。

## クローン

このリポジトリをクローンする際は、サブモジュールを取得するために `--recursive` オプションを利用してください。

```sh
git clone --recursive git@github.com:wintorse/copylink-dev-user-js.git
```

## 開発

このプロジェクトはパッケージマネージャーとして [pnpm](https://pnpm.io/) を使用しています。Node.js >=26 と pnpm >=12 が必要です。

```sh
# 依存関係のインストール
pnpm install

# ビルド
pnpm run build
```

### E2E テスト

```sh
# 初回のみ Chromium をインストール（Linux の CI では --with-deps を追加）
pnpm exec playwright install chromium

# UserScript をビルドしてテストを実行
pnpm test
```

`tests/e2e` のテストは、ビルドした UserScript を Chromium でローカルのテストページに読み込んで実行します。
GM ストレージ API はモックし、クリップボードの読み書きには実際のブラウザ API を使用します。
コピー、設定画面、設定の保存・再読込、iframe 内のショートカット、XML の除外を検証します。
Tampermonkey や Safari Userscripts によるインストール・実行は検証対象に含みません。
結果は `test-results/results.json` に出力され、失敗時にはスクリーンショットとトレースも保存されます。
ブラウザを表示する場合は `pnpm test --headed`、絞り込む場合は `pnpm test --grep "shortcut"` を使用してください。
