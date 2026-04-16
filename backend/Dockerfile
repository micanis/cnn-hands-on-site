# 1. ビルド用の環境
FROM golang:1.25-alpine AS builder
WORKDIR /app

# 依存パッケージのコピーとダウンロード
COPY go.mod go.sum ./
RUN go mod download

# ソースコードをコピーしてビルド
COPY . .
RUN go build -o main .

# 2. 本番用の軽量環境
FROM alpine:latest
WORKDIR /app
# ビルドした実行ファイルだけをコピー
COPY --from=builder /app/main .

# 実行
EXPOSE 8080
CMD ["./main"]