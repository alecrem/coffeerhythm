# 珈琲リズム — ウェブサイト

福岡県糸島市のコーヒー店「珈琲リズム」の1ページ構成のウェブサイト。

静的な HTML と CSS のみ。ビルドも依存関係も JavaScript もない。

## ローカルで見る

ビルドは不要。`public/index.html` をブラウザで開く：

```sh
open public/index.html
```

## 構成

```
public/             公開されるのはここだけ
  index.html        ページ本体
  style.css         スタイル
  assets/           web 用に最適化した画像（生成物。下記参照）
logo/               画像の生成に使うロゴの元データ
```

## お店の情報を更新する

| 項目 | 場所 |
|---|---|
| 住所 | `public/index.html` の `.access__address` 内 |
| Instagram のリンク | `public/index.html` に2か所（ボタンとフッター） |
| 地図の位置 | `public/index.html` の `<iframe>` の `src`。座標は直前のコメントに記載 |

座標が書かれているのは iframe の `src` だけ。マップのボタンは座標ではなく住所で検索するので、
地図の位置を直すときに変更するのはその1か所で済む。

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

ビルドがないので、プロジェクト作成時の設定は次のとおり：

- **Framework preset**: `None`
- **Build command**: （空欄）
- **Build output directory**: `public`

## うっかり元に戻さないための決定事項

- **Google マップは埋め込まない。** 地図は OpenStreetMap の iframe。API キーもアカウントも
  不要で、サードパーティの Cookie をページに持ち込まない。Google マップと Apple マップの
  ボタンは外部リンクなので、利用者が押すまで何も読み込まない。
- **Web フォントを使わない。** 日本語は OS のフォントで表示する。外部依存がひとつ減り、
  表示も速い。
- **Instagram のフィードは埋め込まない。** Instagram の API にはビジネスアカウント、Meta への
  アプリ登録、60日で失効するトークンが必要。代わりに置いているプロフィールへのリンクなら、
  期限切れで表示が止まることがない。
