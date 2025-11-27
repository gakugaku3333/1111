# Node.js 20 LTS をベースイメージとして使用
FROM node:20-slim

# 作業ディレクトリを設定
WORKDIR /app

# package.json と package-lock.json をコピー
COPY package*.json ./

# 本番用の依存関係のみをインストール
RUN npm ci --only=production

# ソースコードをコピー
COPY . .

# TypeScript をビルド
RUN npm install -D typescript tsx
RUN npm run build

# 不要なdevDependenciesを削除してイメージサイズを削減
RUN npm prune --production

# Cloud Run では PORT 環境変数が自動的に設定される
ENV PORT=8080

# コンテナ起動時に実行するコマンド
CMD ["npm", "start"]

# ヘルスチェック用エンドポイント
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + process.env.PORT + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"
