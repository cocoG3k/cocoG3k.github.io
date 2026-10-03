# cocoG学入門

Astro 4 の静的ブログ。記事は `src/content/diary/*.md` で管理します。

## ローカルで確認

Node.js 20 以上を使用してください。

```sh
npm ci
npm run dev
```

表示されたローカル URL をブラウザで開きます。

```sh
npm run build
npm test
# または両方をまとめて
npm run test:all
npm run preview
```

環境のホームディレクトリが書き込み不可の場合は、必要に応じて
`ASTRO_TELEMETRY_DISABLED=1 npm run test:all` を使用します。

## 記事を追加

既存記事と同じ YAML frontmatter に title / description / date を設定します。
`tags` は任意です。`category` を省略すると最初のタグをカテゴリーとして表示し、
どちらもない記事は「未分類」になります。本文には通常の Markdown と既存の Spotify 埋め込みを使用できます。

検索対象はタイトル・概要・本文・タグです。空白区切りは AND 検索、英字の大文字小文字と全角半角は正規化します。
カテゴリー、タグ、月、並び順を組み合わせられます。条件は URL に保存されます。

## 公開

既存の GitHub Pages ワークフローを維持しています。main への push でデプロイされるため、
レビューが完了するまで push しないでください。この変更は未公開です。

変更内容・確認範囲は `REVIEW.md` を参照してください。
