# copylink-dev.user.js （UserScript）

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

## クローン

このリポジトリをクローンする際は、サブモジュールを取得するために `--recursive` オプションを利用してください。

```sh
git clone --recursive git@github.com:wintorse/copylink-dev-user-js.git
```
