# 仕様 — 珈琲リズムのウェブサイト

## 目的

来店を考えている人の疑問2つに答える1ページ：

1. **開いているか** → 今月と来月の営業カレンダーをページ上に表示する。訪問者の「今日」
   （日本時間）を基準に、曜日ごとの基本パターンと例外から各日の状態を計算する。
2. **どこにあるか** → 住所と地図。

それ以外は現時点では対象外。

## 制約

- **営業カレンダーとメニューは Sveltia CMS で編集できる。** Eleventy でビルドし、
  カレンダーの判定ロジック（`src/calendar.js`）は本番ページと Sveltia のプレビューで
  同じファイルを共有する。詳細は下の節を参照。
- **無料でホスティングできる。** Cloudflare Pages。
- **トラッキングを行うサードパーティのリソースをページに読み込まない。** 外部ホストの
  Web フォントも、Google の iframe も使わない。
- **日本語のみ。** 客層は地元の人。

## 内容

| セクション | 内容 |
|---|---|
| ヒーロー | ロゴのみ |
| 営業カレンダー | 今月と来月のカレンダー。休みの日と、例外のメモ（例：15時に閉店します）を表示する。未確定の日はグレー。今月のカレンダーの下に、`content/calendar.yml` の `hours_note` に書いた営業時間の文章（例：営業時間 10:00〜17:00 (L.O. 16:30)）を表示する |
| アクセス | 〒819-1148 福岡県糸島市神在西2丁目23-6 1F、Google マップと Apple マップのボタン、OpenStreetMap の地図 |
| メニュー | `/menu/` への一文とボタン。ページ本体は `content/menu.md`（現在は「準備中」） |
| Instagram | 最新のお知らせについての一文と、プロフィールへのボタン |
| フッター | 店名と @coffeerhythm_itoshima |

営業日は月ごとに変わるので Sveltia CMS から編集できるようにし、ページ上のカレンダーで
案内している。メニューもサイトに置いたが、内容が確定するまでは「準備中」のまま。
電話番号と駐車場の情報は、確認が取れていないため引き続き記載していない。

## 決定事項

### Instagram のフィードは埋め込まない

Instagram の Basic Display API は2024年12月に終了した。残っている Graph API は
ビジネスアカウント、Meta に登録したアプリ、60日で失効するトークンが必要で、しかも
ブラウザから直接呼べない（トークンが公開されてしまううえ、CORS に阻まれる）。

公式の `blockquote` で特定の投稿を2件埋め込み、毎月パーマリンクを手で差し替える案も
検討したが、採用しなかった。毎月の作業が発生するうえ、忘れた月には古いカレンダーを
表示してしまう。プロフィールへのボタンだけなら古くなりようがない。

### 地図は Google ではなく OpenStreetMap

Google マップの iframe は、訪問者が何もしなくても Google のスクリプトと Cookie を
読み込む。OpenStreetMap の公式 iframe（`openstreetmap.org/export/embed.html`）は
API キーもアカウントも不要で、トラッキングを持ち込まない。

なお OSM のジオコーダ Nominatim はこの住所を**見つけられない**。完全な住所では結果が
空になり、`糸島市神在西` では深圳の建物が返ってくる。そのため座標は Google マップから
取得して iframe の URL に直接書いている。

Google マップと Apple マップのボタンは残した。外部リンクなので押すまで何も読み込まず、
日本で実際に経路案内に使われているのはこの2つだから。

表示範囲は `bbox` で指定するしかない。OSM の embed が読むパラメータは layer / bbox /
marker の3つだけで、ズームレベルを指定する手段はない。`bbox` を省くと既定値の
`-180,-90,180,90` になり世界全体が表示される（確認済み）。`bbox` は店舗の座標に
余白を足して算出しているため、座標を直すときは `bbox` も一緒に更新する必要がある。

### Web フォントを使わない

日本語は OS のフォント（Hiragino → Yu Gothic → Meiryo → Noto Sans JP）で表示する。
外部へのリクエストがひとつ減り、表示も速い。

### 地図のリンクは住所で検索する（Apple）、Google は確認済みの店舗ページを直接指す

Apple マップのボタンは住所で検索する。こうすることで座標がコード中の1か所（iframe の
`src`）にしか現れず、地図を直すときは1行の編集で済む。

Google マップのボタンは例外で、Google Business Profile で確認済みの店舗ページへの固定
リンク（`maps.app.goo.gl/...`）を直接指す。住所検索のリンクは店舗名も営業時間も表示され
ない汎用のピンにしか案内しないため。店舗の座標が変わった場合、iframe の `src` に加えて、
このリンクも Google の「共有」ボタンから取り直して更新する必要がある。

## テスト

`src/calendar.js` と `src/calendar-render.js` は純粋関数なので、`node --test`
（`pnpm test`）で決定的にテストできる。「今日」の日付は常に引数として渡し、関数内で
`Date.now()` を読まない。テストは `test/calendar.test.js` にある。

それ以外（テンプレート、CSS、Sveltia CMS の設定、OAuth Worker）はロジックを持たない、
または実際のGitHub/Cloudflareとの通信が前提のため、自動テストの対象にしていない。
ビルド・目視・手動でのログイン確認で確かめる。

## 変更履歴

決定を覆したり差し替えたりしたときに、その経緯を書く。現在の状態そのものは上の各節が
説明しているので、ここには重複させない。

### 2026-10-24: 管理画面を Decap CMS から Sveltia CMS に切り替え

Decap CMS の管理画面はモバイルでの表示にほぼ対応しておらず（長年未解決の既知の制限、
decaporg/decap-cms#441 など）、issue #12 で Sveltia CMS に乗り換えた。`config.yml` は
そのまま流用でき、`admin/index.html` の script タグを差し替えるだけで動いた。GitHub
ログイン（既存の OAuth Worker 経由）、カレンダーのカスタムプレビューテンプレート
（`admin/preview-templates/calendar.js`、Decap の `createClass`/`h`/Immutable.js API を
使用）、モバイル表示の改善を Cloudflare Pages のプレビュー環境で確認済み。

保存時に生成される YAML は Decap と異なり、空の省略可能フィールドも明示的に書き出す
（例：`status: ''`）。`resolveDay`（`src/calendar.js`）は `if (exception.status)` のように
真偽値判定しているため、空文字と未設定は同じ扱いになり実害はない。

### 2026-10-22: 営業時間の文章を今月のカレンダーの下に追加

`content/calendar.yml` に `hours_note`（複数行可のテキスト）を追加した。空行区切りの
段落と、段落内の改行だけを扱う最小限のレンダリングで、太字やリストなどは扱わない。
本番ページと Decap のプレビューで同じ `calendar-render.js` のロジックを使っているため、
ここだけ別のMarkdownパーサーを持ち込む必要がなかった。

### 2026-10-22: OAuth のトークンを渡す相手を本番＋プレビュードメインに広げる

当初は `ALLOWED_ORIGIN` を本番ドメイン1つに固定していたが、Cloudflare Pages の
プレビュー URL（`<hash>.coffeerhythm.pages.dev`）からマージ前に Decap CMS の
ログインを確認できないのは不便だと判断し、`*.coffeerhythm.pages.dev` 全体を
許可するよう変更した。hostname の完全一致・サフィックス一致で判定しており、
`coffeerhythm.pages.dev.evil.com` のようななりすましドメインは通らない。

### 2026-10-22: カレンダーの文字コントラストを修正

最終レビューで見つかった、`confirmed_until` 未設定時（＝全日が未確定）に文字が薄すぎて
読みにくい問題を修正した。`.calendar__day--provisional` の `opacity` を .55 から .75 に、
休業日の文字色の濃さを上げた。他に見つかった2点（冗長な fallback、曜日ヘッダーの
アクセシビリティ）は優先度が低いため直さず、issue #6 で追跡する。

### 2026-10-20: 編集可能な営業カレンダーとメニューを追加

Decap CMS（GitHub backend, editorial_workflow）で営業カレンダーとメニューを
編集可能にした。Eleventy を導入し、`public/` をビルド生成物にした。カレンダーの
状態計算は `src/calendar.js` に集約し、本番ページと Decap の管理画面プレビューで
共有している。OAuth プロキシは `worker/` サブフォルダの Cloudflare Worker（この
repo 専用）。

### 2026-10-13: Google マップのボタンを住所検索から店舗ページへ

Google Business Profile で店舗が確認された。従来の住所検索リンクに戻すメリットがなく
なったため、確認済みの店舗ページへの固定リンクに差し替えた。

## 未対応

- 独自ドメイン。取得したら `og:image` と `<link rel="canonical">` の URL も
  差し替える。どちらも絶対 URL で `coffeerhythm.pages.dev` を指しているため。
  `worker/src/index.js` の `ALLOWED_ORIGIN_ROOT`（OAuth のトークンを渡す相手を絞る値）も
  本番ドメインを指しているので、このときに一緒に更新すること。
