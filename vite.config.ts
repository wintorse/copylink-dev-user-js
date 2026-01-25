import path from "node:path";
import { defineConfig } from "vite";
import monkey from "vite-plugin-monkey";
import pkg from "./package.json";

const version = pkg.version;

export default defineConfig({
  plugins: [
    monkey({
      entry: "src/userscript/entry.ts",
      build: {
        fileName: `copylink-dev.user.js`,
      },
      userscript: {
        name: "copylink.dev",
        namespace: "https://github.com/wintorse/copylink-dev-user-js",
        version,
        description: {
          en: "Copy links with shortcuts. On supported sites, create Slack emoji-enhanced links.",
          ja: "ショートカットでリンクをコピー。対応サイトではSlack絵文字つきリンクも生成します。",
          "zh-CN":
            "使用快捷键复制链接。在支持的网站上创建带 Slack 表情符号的链接。",
        },
        author: "wintorse",
        supportURL: "https://github.com/wintorse/copylink-dev-user-js/issues",
        updateURL:
          "https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js",
        downloadURL:
          "https://gist.github.com/wintorse/10e2ec0206a0f29522cb06c6dafd2611/raw/copylink-dev.user.js",
        match: ["*://*/*"],
        grant: ["GM.getValue", "GM.setValue"],
        license: "MIT",
      },
    }),
  ],
  resolve: {
    alias: [
      {
        find: "@copylink-dev/public",
        replacement: path.resolve(__dirname, "src/copylink-dev/public"),
      },
      {
        find: "@copylink-dev",
        replacement: path.resolve(__dirname, "src/copylink-dev/src"),
      },
    ],
  },
});
