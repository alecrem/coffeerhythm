# 珈琲リズム — ウェブサイト

福岡県糸島市のコーヒー店「珈琲リズム」の1ページ構成のウェブサイト。

Eleventy でビルドする静的サイト。営業カレンダーとメニューは Decap CMS で編集できる。

## ローカルで見る

```sh
pnpm install
pnpm run serve
```

`http://localhost:8080/` を開く。

## 構成

```
content/            calendar.yml, menu.md（Decap CMSが編集する対象）
src/                Eleventyの入力（テンプレート、calendar.js、CSS、画像）
admin/              Decap CMS（config.yml, index.html, preview-templates/）
worker/             OAuthプロキシ（Cloudflare Worker、このrepo専用、別デプロイ）
public/             Eleventyの出力。生成物のためgit管理外
test/               calendar.jsのテスト（node --test）
logo/               画像の生成に使うロゴの元データ
```

## お店の情報を更新する

技術者でない場合は `/admin/` の管理画面（Decap CMS）から、営業カレンダーとメニューを
編集できる。保存するとブランチとPRが作られ、Cloudflare Pagesのプレビュー URL で
確認した上で「公開」すると main にマージされる。

| 項目 | 場所 |
|---|---|
| 営業カレンダー | `/admin/` の「営業カレンダー」、または直接 `content/calendar.yml` |
| メニュー | `/admin/` の「メニュー」、または直接 `content/menu.md` |
| 住所 | `src/index.njk` の `.access__address` 内 |
| Instagram のリンク | `src/_includes/base.njk` と `src/index.njk` |
| 地図の位置 | `src/index.njk` の `<iframe>` の `src`。座標は直前のコメントに記載 |
| Googleマップのボタンのリンク | `src/index.njk` の「Googleマップで開く」ボタンの `href` |

## assets/ の画像を再生成する

元データから ImageMagick で生成する（`brew install imagemagick`）。元データを
差し替えたときだけ実行すればよい：

```sh
magick logo/coffeerhythm-logo.png -resize 600x600 -strip public/assets/logo.png
magick logo/coffeerhythm-logo.png -resize 64x64 -strip public/assets/favicon.png
magick logo/coffeerhythm-logo.png -resize 180x180 -background '#114727' -alpha remove -alpha off \
  -strip public/assets/apple-touch-icon.png
magick -size 1200x630 xc:'#F4EAE0' \( logo/coffeerhythm-logo.png -resize 440x440 \) \
  -gravity center -composite -strip -quality 88 public/assets/og.jpg
```

apple-touch-icon だけ `-alpha remove -alpha off` で透過を落としている。iOS は透過部分を
黒く塗るため、緑で塗りつぶす必要がある。角丸は iOS 側でマスクされるので、こちらでは付けない。

## Cloudflare Pages の設定

- **Framework preset**: `None`
- **Build command**: `npx @11ty/eleventy`
- **Build output directory**: `public`

## OAuth Worker（Decap CMSのログイン用）

`worker/` は Decap CMS が GitHub にログインするための OAuth プロキシ。Cloudflare
Pages とは別に `cd worker && npx wrangler deploy` でデプロイする。`GITHUB_OAUTH_CLIENT_ID`
と `GITHUB_OAUTH_CLIENT_SECRET` は `npx wrangler secret put` で設定し、repo には
含めない。

## うっかり元に戻さないための決定事項

- **Google マップは埋め込まない。** 地図は OpenStreetMap の iframe。API キーもアカウントも
  不要で、サードパーティの Cookie をページに持ち込まない。Google マップと Apple マップの
  ボタンは外部リンクなので、利用者が押すまで何も読み込まない。
- **Web フォントを使わない。** 日本語は OS のフォントで表示する。外部依存がひとつ減り、
  表示も速い。
- **Instagram のフィードは埋め込まない。** Instagram の API にはビジネスアカウント、Meta への
  アプリ登録、60日で失効するトークンが必要。代わりに置いているプロフィールへのリンクなら、
  期限切れで表示が止まることがない。
