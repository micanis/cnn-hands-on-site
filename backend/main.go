package main

import (
	"context"
	"database/sql"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"cloud.google.com/go/storage"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"google.golang.org/api/option"

	"portal-api/internal/handler"
	"portal-api/internal/repository"
	"portal-api/internal/router"
)

func main() {
	log.Println("--- サーバー起動処理開始 ---")

	_ = godotenv.Load() // ローカル用。Herokuでは無視される

	// --- DB 接続 + コネクションプール ---
	db := mustInitDB()
	defer db.Close()

	// --- GCS クライアント ---
	ctx := context.Background()
	gcsClient := mustInitGCS(ctx)
	defer gcsClient.Close()

	bucketName := os.Getenv("GCS_BUCKET_NAME")
	if bucketName == "" {
		bucketName = "cnn-hands-on-portal-storage"
	}

	// --- 依存性注入（Dependency Injection） ---
	materialRepo := repository.NewMaterialRepository(db)
	questionRepo := repository.NewQuestionRepository(db)
	surveyRepo := repository.NewSurveyRepository(db)

	materialHandler := handler.NewMaterialHandler(materialRepo, gcsClient, bucketName)
	questionHandler := handler.NewQuestionHandler(questionRepo)
	storageHandler := handler.NewStorageHandler(gcsClient, bucketName)
	surveyHandler := handler.NewSurveyHandler(surveyRepo)

	// --- HTTP サーバー ---
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      router.New(materialHandler, questionHandler, storageHandler, surveyHandler),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// --- Graceful Shutdown ---
	shutdownCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("Server running on port %s", port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-shutdownCtx.Done()
	log.Println("シャットダウンシグナル受信、サーバーを停止中...")

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("Graceful shutdown error: %v", err)
	}
	log.Println("サーバー停止完了")
}

// mustInitDB はデータベース接続を初期化する。失敗時は Fatal
func mustInitDB() *sql.DB {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL が設定されていません")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("DB接続準備失敗: %v", err)
	}

	// コネクションプール設定（Neon サーバーレス DB 向け最適値）
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("DB接続(Ping)失敗: %v", err)
	}
	log.Println("Neonデータベース接続成功")
	return db
}

// mustInitGCS はGCSクライアントを初期化する。失敗時は Fatal
func mustInitGCS(ctx context.Context) *storage.Client {
	var (
		client *storage.Client
		err    error
	)

	if gcpKey := os.Getenv("GCP_CREDENTIALS_JSON"); gcpKey != "" {
		client, err = storage.NewClient(ctx, option.WithCredentialsJSON([]byte(gcpKey)))
	} else {
		client, err = storage.NewClient(ctx, option.WithCredentialsFile("credentials.json"))
	}

	if err != nil {
		log.Fatalf("GCSクライアント作成失敗: %v", err)
	}
	log.Println("GCSクライアント準備完了")
	return client
}
