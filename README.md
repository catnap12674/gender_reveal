# ジェンダーリビール WEBアプリ

スマホの画面を指でこすると、徐々に赤ちゃんの性別（男の子💙 / 女の子💗）が見えてくる
ジェンダーリビール演出用のWEBアプリです。Cloudflare Pages + Cloudflare KV で動作します。

- 管理者は `/admin` で性別を登録・変更（簡易パスワード認証）
- ゲストは `/reveal` のURLを開いて画面をこすると結果が見える
- フレームワークなし（Vanilla JS）＋ Cloudflare Pages Functions（サーバーレスAPI）
- 依存ライブラリなし。赤ちゃんイラストはSVGをJSで動的生成

## 1. ディレクトリ構成

```
gender-reveal-app/
├── functions/
│   └── api/
│       ├── admin-login.js   # POST /api/admin-login  (パスワード検証)
│       ├── gender.js        # GET  /api/gender        (現在の性別を取得・公開用)
│       └── save.js          # POST /api/save          (性別をKVへ保存)
├── public/
│   ├── css/
│   │   └── style.css        # 全ページ共通スタイル（丸みのある明るいデザイン）
│   ├── js/
│   │   ├── admin.js         # 管理画面のロジック
│   │   ├── reveal.js        # スクラッチ演出＆キラキラアニメーション
│   │   └── svg-babies.js    # 赤ちゃんSVGイラスト生成
│   ├── admin.html           # 管理者画面 (/admin)
│   ├── index.html           # トップページ
│   └── reveal.html          # 公開画面 (/reveal)
├── package.json
├── wrangler.toml             # Cloudflare Pages / KV の設定
└── .gitignore
```

## 2. 各画面・APIの役割

### `/admin`（管理者画面）
1. パスワードを入力してログイン（`/api/admin-login` に問い合わせ）
2. 「男の子 / 女の子」を選択して保存すると `/api/save` 経由で KV に書き込み
3. パスワードは環境変数 `ADMIN_PASSWORD` と照合（サーバー側で毎回検証）

### `/reveal`（公開画面）
1. ページ読み込み時に `/api/gender` から現在登録されている性別を取得
2. canvas 上に「削れる前のカバー層」を描画
3. 指（タッチ）やマウスでこすると、こすった箇所を中心に
   `globalCompositeOperation = "destination-out"` を使って**少しずつ**透明にする
   （1回のストロークでは完全に消えず、同じ場所を数回こすると徐々にクリアになる）
4. 定期的に canvas を縮小サンプリングして「こすった割合」を計算し、
   **55%以上こすると自動的に残りが透明化**され、結果が完全に見える
5. 見えた後、色（男の子=青系 / 女の子=ピンク系）とSVGイラストが背景に表示され、
   キラキラが舞うアニメーションが再生される

### API
| メソッド | パス | 内容 |
|---|---|---|
| GET | `/api/gender` | 現在の性別（`boy` / `girl` / `null`）を返す（認証不要・公開） |
| POST | `/api/admin-login` | `{ password }` を検証し `{ ok: true/false }` を返す |
| POST | `/api/save` | `{ password, gender }` を検証し KV へ保存 |

## 3. セットアップ手順（ローカル開発）

### 3-1. 前提
- Node.js 18以上
- Cloudflareアカウント
- `npm install -g wrangler`（またはプロジェクト内の devDependencies を利用）

### 3-2. インストール

```bash
cd gender-reveal-app
npm install
```

### 3-3. ローカルでの動作確認

```bash
npm run dev
```

`wrangler pages dev public --kv GENDER_KV --binding ADMIN_PASSWORD=change-me-please`
が実行され、`http://localhost:8788` などのURLが表示されます。
- `http://localhost:8788/reveal` … 公開画面
- `http://localhost:8788/admin` … 管理画面（パスワード: `change-me-please`。変更する場合は
  `package.json` の `dev` スクリプトか、`.dev.vars` ファイルを作って上書きしてください）

`.dev.vars` を使う場合の例（Git管理には含めないでください）:

```
ADMIN_PASSWORD=your-local-password
```

## 4. Cloudflare KV のセットアップ

KVは「性別データ（boy / girl）」だけを保存するシンプルな用途です。

### 4-1. KV Namespace の作成

```bash
wrangler kv namespace create GENDER_KV
```

実行すると以下のような出力が得られます（IDは実際の値に置き換わります）。

```
🌀 Creating namespace with title "gender-reveal-app-GENDER_KV"
✨ Success!
Add the following to your configuration file:
[[kv_namespaces]]
binding = "GENDER_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 4-2. `wrangler.toml` に反映

出力された `id` を `wrangler.toml` の該当箇所に貼り付けます。

```toml
[[kv_namespaces]]
binding = "GENDER_KV"
id = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 4-3. Cloudflare Pages ダッシュボード側でも紐付け（重要）

`wrangler.toml` の設定はローカル開発（`wrangler pages dev`）用です。
本番の Pages プロジェクトには、ダッシュボードから **同じKV Namespaceを手動でバインド**する必要があります。

1. Cloudflareダッシュボード → **Workers & Pages** → 対象の Pages プロジェクトを選択
2. **Settings** → **Functions** → **KV namespace bindings**
3. 「Add binding」をクリックし、
   - Variable name: `GENDER_KV`
   - KV namespace: 手順4-1で作成した Namespace を選択
4. 保存後、**再デプロイ**すると反映されます（Production / Preview それぞれで設定が必要です）

## 5. GitHubリポジトリへの追加方法

GitHub＋Cloudflare Pages の構成では、まずこのプロジェクトをGitHubリポジトリにpushします。
以降、`main`ブランチにpushするたびにCloudflare Pagesが自動でビルド・デプロイしてくれます。

### 5-1. Gitの初期化とコミット（初回のみ）

zipを展開したフォルダで実行してください（`.gitignore` は同梱済みなので
`node_modules/` や `.wrangler/`、`.dev.vars` は自動的に除外されます）。

```bash
cd gender-reveal-app
git init
git add .
git commit -m "Initial commit: gender reveal app"
```

### 5-2. GitHubに空のリポジトリを作成

**GitHub CLI（`gh`）を使う場合**（インストール済みでログイン済みなら最も簡単）:

```bash
gh repo create gender-reveal-app --private --source=. --remote=origin --push
```

これ1行でリポジトリ作成・リモート登録・pushまで完了します（完了したら 5-3 は不要です）。

**GitHubのWeb画面から作成する場合**:

1. https://github.com/new を開く
2. Repository name に `gender-reveal-app` などを入力
3. Public / Private はお好みで選択（管理者パスワード等の秘密情報はコードに含まれていませんが、
   個人利用なら Private を推奨）
4. 「Add a README file」等のチェックは**すべて外した状態**で「Create repository」
   （このプロジェクトには既にREADMEがあるため、空のリポジトリとして作成します）

### 5-3. リモートを登録してpush（Web画面で作成した場合）

作成後の画面に表示されるURLを使って、以下を実行します（`<your-account>` はご自身のGitHubアカウント名）。

```bash
git branch -M main
git remote add origin https://github.com/<your-account>/gender-reveal-app.git
git push -u origin main
```

HTTPS認証を求められた場合は、GitHubアカウントのパスワードではなく
**Personal Access Token**（Settings → Developer settings → Personal access tokens）を使用してください。
SSHで運用したい場合は `git remote add origin git@github.com:<your-account>/gender-reveal-app.git` を使います。

### 5-4. 更新を反映する場合（2回目以降）

性別の変更ではなく、コード自体を修正した場合は以下でpushするだけで、
Cloudflare Pages側が自動的に再デプロイします（設定は6章参照）。

```bash
git add .
git commit -m "Update: 変更内容を記載"
git push
```

## 6. Cloudflare Pages へのデプロイ手順（GitHub連携・推奨）

1. Cloudflareダッシュボード（https://dash.cloudflare.com/）を開く
2. 左メニューの **Workers & Pages** → **Create application** → **Pages** タブ →
   **Connect to Git**
3. GitHubアカウントを連携し、`gender-reveal-app` リポジトリを選択
4. ビルド設定で以下を入力
   - Framework preset: **None**
   - Build command: 空欄のまま（ビルド不要）
   - Build output directory: `public`
5. 「Save and Deploy」をクリック

`functions/` ディレクトリはPagesが自動検出し、`/api/*` のサーバーレス関数として
デプロイされます。追加のビルドツールやNode設定は不要です。

初回デプロイの時点では KV バインディングと `ADMIN_PASSWORD` はまだ設定されていないため、
`/admin` や `/reveal` はエラーになります。続けて7章・4-3章の設定を行ってください。

### 6-1. 継続的デプロイの仕組み

- `main`ブランチへのpush → **Production** 環境に自動デプロイ
- それ以外のブランチへのpushやPull Request → 一意のURLを持つ **Preview** 環境が自動生成
- デプロイ状況は Cloudflareダッシュボードの対象プロジェクト → **Deployments** タブで確認できます
- Production / Preview はそれぞれ独立して環境変数・KVバインディングを設定する必要があります（後述）

### 6-2. よくあるエラー: `It looks like you've run a Workers-specific command in a Pages project`

ビルドログに以下のようなエラーが出てデプロイに失敗する場合があります。

```
Executing user deploy command: npx wrangler deploy
✘ [ERROR] It looks like you've run a Workers-specific command in a Pages project.
  For Pages, please run `wrangler pages deploy` instead.
Failed: error occurred while running deploy command
```

**原因**: Cloudflareの新しいビルド管理画面（Workers & Pages統合UI）が、リポジトリ内に
`wrangler.toml` があることを検知し、デプロイコマンドを自動的に Workers用の
`npx wrangler deploy` に設定してしまうことがあります。このプロジェクトは
Pagesの `functions/` + 静的ファイル構成なので、`wrangler pages deploy` を
使う必要があります。

**対処方法（ダッシュボードでデプロイコマンドを修正）**:

1. Cloudflareダッシュボード → 対象の Pages プロジェクトを開く
2. **Settings** → **Builds**（環境によっては「Build & deployments」や
   「Build configuration」と表示されます）を開く
3. **Deploy command** の項目を探し、「Edit」または鉛筆アイコンをクリック
4. 値を次のように変更します

   ```
   npx wrangler pages deploy public
   ```

5. 保存し、**Deployments** タブから最新のデプロイを **Retry deployment**
   するか、何か1つコミットしてpushして再デプロイをトリガーします

もし「Deploy command」の項目が見当たらない場合は、プロジェクトの作成をやり直し、
**Workers & Pages** → **Create application** → **Pages** タブ（**Workers** タブではなく）
から **Connect to Git** を選び直してください。UIのバージョンによっては
Pagesタブから作成すると、そもそもこのデプロイコマンドの概念自体が現れず、
自動でPages用の処理が行われます。

**代替手段**: ダッシュボードの設定を変更してもうまくいかない場合は、
GitHub連携（自動デプロイ）を使わず、9章の「Wrangler CLIから直接デプロイする方法」
（`npx wrangler pages deploy public`をローカルやCI上で手動実行）に切り替えても
同じ成果物をデプロイできます。

### 6-3. よくあるエラー: `Authentication error [code: 10000]`

6-2の対処でデプロイコマンドは正しく `npx wrangler pages deploy public` が
実行されるようになったものの、以下のように認証エラーで失敗することがあります。

```
Executing user deploy command: npx wrangler pages deploy public
✘ [ERROR] A request to the Cloudflare API (.../pages/projects/gender-reveal-app) failed.
  Authentication error [code: 10000]
📎 It looks like you are authenticating Wrangler via a custom API token set in an environment variable.
```

**原因**: Cloudflareのビルド環境が自動的に用意する `CLOUDFLARE_API_TOKEN` に、
Cloudflare Pages プロジェクトを操作する権限（Pages: Edit）が含まれていないことが
あります。ログに「Super Administrator」と表示されていても、実際にビルドで
使われているのはその管理者アカウント全体の権限ではなく、権限を絞った専用トークン
であるため、Pages APIへのアクセスだけ拒否されるという現象です。これは
Cloudflareの「Workers」と「Pages」が統合される過渡期に起きやすい既知の不具合です。

ダッシュボードのトークン発行設定を探して直すよりも、**自分で発行した権限確実な
APIトークンを使ってGitHub Actionsからデプロイする方法に切り替えるのが確実**です。
6-4で手順を説明します。

### 6-4. もっと確実な方法: GitHub Actionsでデプロイする（推奨）

Cloudflare側の自動ビルド（Git連携）に権限の問題が起きている間は、GitHub Actions
から自分で発行したAPIトークンを使ってデプロイする方法に切り替えるのがおすすめです。
この方法なら権限不足になることがなく、GitHubへのpushをきっかけに確実にデプロイされます。

#### 6-4-1. Cloudflare APIトークンを作成する

1. https://dash.cloudflare.com/profile/api-tokens を開く
2. 「Create Token」→「Create Custom Token」を選択
3. 以下を設定
   - Token name: 任意（例: `gender-reveal-app-deploy`）
   - Permissions: **Account** / **Cloudflare Pages** / **Edit**
   - Account Resources: **Include** / 対象のアカウント（`Mit12674@gmail.com's Account`）
4. 「Continue to summary」→「Create Token」
5. 表示されたトークンをコピー（**この画面を閉じると二度と表示されません**）

#### 6-4-2. GitHubリポジトリにSecretsを登録する

対象リポジトリ → **Settings** → **Secrets and variables** → **Actions** →
「New repository secret」で、以下の2つを登録します。

| Name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | 6-4-1で作成したトークン |
| `CLOUDFLARE_ACCOUNT_ID` | `3ae890c8705a2a84b96d9698814d8cfb`（Cloudflareダッシュボードの右下、または前回のビルドログの「Account ID」欄に表示されていたものです。念のため https://dash.cloudflare.com のホーム画面右サイドバーでも確認できます） |

#### 6-4-3. ワークフローファイル

このプロジェクトには `.github/workflows/deploy.yml` を同梱済みです。内容は以下の通りで、
`main`ブランチへのpushをトリガーに `wrangler pages deploy` を実行します。追加の設定は不要です。

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches:
      - main
  workflow_dispatch: {}

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy public --project-name=gender-reveal-app
```

Secretsを登録した状態でこのファイルをpush（またはリポジトリに追加）すれば、
GitHubの **Actions** タブでデプロイの進行状況を確認できます。

#### 6-4-4. Cloudflare側の自動ビルドを止める（任意・推奨）

GitHub Actionsでデプロイするようになったら、Cloudflare側の失敗し続ける自動ビルドは
不要なので止めておくと通知が煩わしくありません。

1. Cloudflareダッシュボード → 対象の Pages プロジェクト → **Settings** → **Builds**
2. Git連携の項目から「Disconnect」（または「Manage git connection」→切断）を選択

Git連携を切断しても、GitHub Actions側からの `wrangler pages deploy` による
デプロイ（Direct Upload）には影響ありません。KVバインディングや環境変数
（`ADMIN_PASSWORD`）は引き続き4-3章・7章の手順でダッシュボードから設定してください
（これらはデプロイ方法に関わらず同じプロジェクトに対して設定します）。

## 7. 環境変数（ADMIN_PASSWORD）の設定

**必ず Secret として設定してください**（`wrangler.toml` の `[vars]` はローカル開発の初期値です。
GitHub連携でデプロイする場合、本番用の値は必ずダッシュボードで設定します）。

Cloudflareダッシュボード:
1. 対象の Pages プロジェクト → **Settings** → **Environment variables**
2. **Production** タブで「Add variable」
   - Variable name: `ADMIN_PASSWORD`
   - Value: 好きな管理者パスワード（他人に推測されにくいもの）
   - 「Encrypt」にチェックを入れて Secret 化することを推奨
3. ゲストに共有する前にPreview環境でも試したい場合は **Preview** タブでも同様に設定
4. 保存後、**Deployments** タブから最新デプロイを「Retry deployment」するか、
   何かをpushして再デプロイすると反映されます（環境変数の変更は次回デプロイから反映）

CLIから設定したい場合（Wrangler CLIがローカルにある場合のみ）:

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name=gender-reveal-app
```

## 8. 動作確認

- `https://<your-project>.pages.dev/admin` … パスワードでログインし、性別を保存
- `https://<your-project>.pages.dev/reveal` … このURLをゲストに共有

独自ドメインを使いたい場合は Pages プロジェクトの **Custom domains** から設定できます。

## 9. （参考）Wrangler CLIから直接デプロイする方法

GitHub連携を使わず手元から直接デプロイしたい場合は、以下のコマンドでも可能です。

```bash
npx wrangler pages deploy public --project-name=gender-reveal-app
```

初回は Cloudflare へのログイン（`wrangler login`）を求められます。ただし、この方法では
コードの変更履歴管理がGit任せになる（＝GitHub側のリポジトリと自動連携しない）ため、
GitHub＋Cloudflareの構成にする場合は6章の方法を使ってください。

## 10. カスタマイズのヒント

- こすると自動で全部見える閾値は `public/js/reveal.js` の `COMPLETE_THRESHOLD`（初期値 0.55 = 55%）
- ブラシの太さは同ファイルの `BRUSH_RADIUS`
- 色味やフォントは `public/css/style.css` で調整可能（Google Fontsの
  「M PLUS Rounded 1c」を使用した丸みのあるデザイン）
- 赤ちゃんイラストの配色・パーツは `public/js/svg-babies.js` の `babySvgMarkup()` を編集

## 11. 注意事項（重要）

- `/api/gender` は演出のためブラウザからのGETに公開で応答します。
  ブラウザの開発者ツール（Network タブ）を見れば、こする前でも性別を確認できてしまう
  仕組み上の制約があります。サプライズ演出としては一般的な実装ですが、
  「絶対にネタバレされたくない」場合はゲストに開発者ツールを開かないようお願いする、
  または信頼できる相手だけにURLを共有してください。
- 管理画面のパスワード保護は「簡易認証」です。長期セッションやアカウント管理機能はありません。
  複数人で管理する必要がある場合は別途拡張してください。
- KVの書き込みは反映まで数秒かかる場合があります（Cloudflare KVの結果整合性の特性）。
