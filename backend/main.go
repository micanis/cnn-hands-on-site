package main

import (
	"compress/gzip"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"syscall"
	"time"

	"cloud.google.com/go/storage"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"google.golang.org/api/option"
)

// ---- データ構造 ----

type Material struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Pages    int    `json:"pages"`
	Category string `json:"category"`
	FilePath string `json:"file_path"`
}

type Question struct {
	ID        int    `json:"id"`
	Session   string `json:"session"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// ---- アプリケーション本体 ----

// Server は依存関係をまとめた構造体
type Server struct {
	db         *sql.DB
	gcsClient  *storage.Client
	bucketName string
}

func main() {
	log.Println("--- サーバー起動処理開始 ---")

	_ = godotenv.Load() // ローカル用。Herokuでは無視される

	// --- DB接続 ---
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("DATABASE_URL が設定されていません")
	}
	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("DB接続準備失敗: %v", err)
	}
	defer db.Close()

	// コネクションプール設定（Neon サーバーレス DB 向け最適値）
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	if err := db.Ping(); err != nil {
		log.Fatalf("DB接続(Ping)失敗: %v", err)
	}
	log.Println("Neonデータベース接続成功")

	// --- GCSクライアント ---
	ctx := context.Background()
	gcsClient, err := newGCSClient(ctx)
	if err != nil {
		// GCS無しでは続行不可なので Fatal にする
		log.Fatalf("GCSクライアント作成失敗: %v", err)
	}
	defer gcsClient.Close()
	log.Println("GCSクライアント準備完了")

	bucketName := os.Getenv("GCS_BUCKET_NAME")
	if bucketName == "" {
		bucketName = "cnn-hands-on-portal-storage" // フォールバック
	}

	srv := &Server{
		db:         db,
		gcsClient:  gcsClient,
		bucketName: bucketName,
	}

	// --- ルーティング ---
	mux := http.NewServeMux()
	mux.HandleFunc("/api/materials", srv.handleMaterials)
	mux.HandleFunc("/api/save-material", srv.handleSaveMaterial)
	mux.HandleFunc("/api/upload-url", srv.handleUploadURL)
	mux.HandleFunc("/api/download-url", srv.handleDownload)
	mux.HandleFunc("/api/questions", srv.handleGetQuestions)
	mux.HandleFunc("/api/ask-question", srv.handlePostQuestion)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// --- Graceful Shutdown ---
	httpServer := &http.Server{
		Addr:         ":" + port,
		Handler:      corsMiddleware(gzipMiddleware(mux)),
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second, // ダウンロードを考慮して長めに設定
		IdleTimeout:  120 * time.Second,
	}

	// シグナルハンドリング用のcontext
	shutdownCtx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// サーバーをバックグラウンドで起動
	go func() {
		log.Printf("Server running on port %s", port)
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	// シグナルを待機
	<-shutdownCtx.Done()
	log.Println("シャットダウンシグナル受信、サーバーを停止中...")

	// 最大10秒でグレースフルシャットダウン
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpServer.Shutdown(ctx); err != nil {
		log.Printf("Graceful shutdown error: %v", err)
	}
	log.Println("サーバー停止完了")
}

// newGCSClient は環境変数に応じてGCSクライアントを生成する
func newGCSClient(ctx context.Context) (*storage.Client, error) {
	if gcpKey := os.Getenv("GCP_CREDENTIALS_JSON"); gcpKey != "" {
		return storage.NewClient(ctx, option.WithCredentialsJSON([]byte(gcpKey)))
	}
	return storage.NewClient(ctx, option.WithCredentialsFile("credentials.json"))
}

// ---- ミドルウェア ----

// corsMiddleware は全ルートにCORSヘッダーを付与し、OPTIONSを処理する
func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// gzipResponseWriter は http.ResponseWriter をラップし、gzip 圧縮を行う
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (grw gzipResponseWriter) Write(b []byte) (int, error) {
	return grw.Writer.Write(b)
}

// gzipMiddleware はクライアントが gzip を受け入れる場合にレスポンスを圧縮する
// ただしバイナリストリーミング（download-url）は除外する
func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ダウンロードエンドポイントは gzip をスキップ（既に大容量バイナリをストリーミングするため）
		if strings.HasPrefix(r.URL.Path, "/api/download-url") {
			next.ServeHTTP(w, r)
			return
		}

		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		defer gz.Close()

		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Vary", "Accept-Encoding")
		// gzip 圧縮するため Content-Length は不定になるので削除
		w.Header().Del("Content-Length")

		next.ServeHTTP(gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
	})
}

// ---- ハンドラー ----

// handleMaterials は教材一覧を返す (GET /api/materials?category=xxx)
func (s *Server) handleMaterials(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	category := r.URL.Query().Get("category")

	var (
		rows *sql.Rows
		err  error
	)
	const baseQuery = `SELECT id, title, pages, category, file_path FROM materials`

	if category != "" {
		rows, err = s.db.QueryContext(ctx, baseQuery+` WHERE category = $1 ORDER BY id ASC`, category)
	} else {
		rows, err = s.db.QueryContext(ctx, baseQuery+` ORDER BY id ASC`)
	}
	if err != nil {
		log.Printf("handleMaterials QueryContext error: %v", err)
		http.Error(w, "DB Query Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	materials := make([]Material, 0) // nil ではなく空スライスを返す
	for rows.Next() {
		var m Material
		if err := rows.Scan(&m.ID, &m.Title, &m.Pages, &m.Category, &m.FilePath); err != nil {
			log.Printf("handleMaterials Scan error: %v", err)
			continue
		}
		materials = append(materials, m)
	}
	if err := rows.Err(); err != nil {
		log.Printf("handleMaterials rows.Err: %v", err)
		http.Error(w, "DB Read Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "public, max-age=60") // 1分キャッシュ
	json.NewEncoder(w).Encode(materials)
}

// handleSaveMaterial は教材のメタデータをDBに保存する (POST /api/save-material)
func (s *Server) handleSaveMaterial(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var m Material
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if m.Title == "" || m.Category == "" || m.FilePath == "" {
		http.Error(w, "title, category, file_path は必須です", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO materials (title, pages, category, file_path) VALUES ($1, $2, $3, $4)`,
		m.Title, m.Pages, m.Category, m.FilePath,
	)
	if err != nil {
		log.Printf("handleSaveMaterial ExecContext error: %v", err)
		http.Error(w, "Save Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// handleUploadURL はGCSへの署名付きアップロードURLを発行する (GET /api/upload-url?filename=xxx&contentType=xxx)
func (s *Server) handleUploadURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	fileName := r.URL.Query().Get("filename")
	contentType := r.URL.Query().Get("contentType")
	if fileName == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}
	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// 署名付きURL（PUT用）を発行する（15分間有効）
	opts := &storage.SignedURLOptions{
		Scheme:      storage.SigningSchemeV4,
		Method:      "PUT",
		Expires:     time.Now().Add(15 * time.Minute),
		ContentType: contentType,
	}

	url, err := s.gcsClient.Bucket(s.bucketName).SignedURL(fileName, opts)
	if err != nil {
		log.Printf("handleUploadURL SignedURL error: %v", err)
		http.Error(w, "Failed to generate upload URL", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"uploadUrl": url})
}

// handleDownload はGCSのオブジェクトをプロキシ配信する
// (GET /api/download-url?filename=xxx&action=download)
//
// 大容量ファイル対応:
//   - io.CopyBuffer で 32KB バッファを使用しメモリ効率を改善
//   - http.ResponseWriter は既にチャンク転送に対応しているため
//     ファイルサイズによらずストリーミング配信できる
func (s *Server) handleDownload(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	fileName := r.URL.Query().Get("filename")
	if fileName == "" {
		http.Error(w, "filename is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	obj := s.gcsClient.Bucket(s.bucketName).Object(fileName)
	rc, err := obj.NewReader(ctx)
	if err != nil {
		log.Printf("handleDownload GCS Read error (file=%s): %v", fileName, err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer rc.Close()

	// Content-Type: 拡張子で判別、不明な場合はバイナリとして扱う（全拡張子対応）
	ext := filepath.Ext(fileName)
	contentType := mime.TypeByExtension(ext)
	if contentType == "" {
		contentType = "application/octet-stream"
	}
	w.Header().Set("Content-Type", contentType)

	// NewReader の Attrs からサイズを取得（obj.Attrs() への追加ラウンドトリップを回避）
	if rc.Attrs.Size > 0 {
		w.Header().Set("Content-Length", fmt.Sprintf("%d", rc.Attrs.Size))
	}

	action := r.URL.Query().Get("action")
	if action == "download" || ext == ".ipynb" {
		w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(fileName)))
	} else {
		w.Header().Set("Content-Disposition", "inline")
	}

	// ファイルは変わりにくいため長めにキャッシュ
	w.Header().Set("Cache-Control", "public, max-age=3600")

	// 32KBバッファでストリーミング転送（大容量ファイル対応）
	buf := make([]byte, 32*1024)
	if _, err := io.CopyBuffer(w, rc, buf); err != nil {
		// ヘッダー送信後のエラーはクライアント切断が多いため Warning レベルで記録
		log.Printf("handleDownload CopyBuffer warning (file=%s): %v", fileName, err)
	}
}

// handleGetQuestions は質問一覧を返す (GET /api/questions)
func (s *Server) handleGetQuestions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	ctx := r.Context()
	const query = `
		SELECT id, session, content,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY/MM/DD HH24:MI')
		FROM questions
		ORDER BY id DESC`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		log.Printf("handleGetQuestions QueryContext error: %v", err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	questions := make([]Question, 0)
	for rows.Next() {
		var q Question
		if err := rows.Scan(&q.ID, &q.Session, &q.Content, &q.CreatedAt); err != nil {
			log.Printf("handleGetQuestions Scan error: %v", err)
			continue
		}
		questions = append(questions, q)
	}
	if err := rows.Err(); err != nil {
		log.Printf("handleGetQuestions rows.Err: %v", err)
		http.Error(w, "DB Read Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// 質問は即時反映が必要なためキャッシュしない
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(questions)
}

// handlePostQuestion は質問を投稿する (POST /api/ask-question)
func (s *Server) handlePostQuestion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var q Question
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if q.Session == "" || q.Content == "" {
		http.Error(w, "session と content は必須です", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	_, err := s.db.ExecContext(ctx,
		`INSERT INTO questions (session, content) VALUES ($1, $2)`,
		q.Session, q.Content,
	)
	if err != nil {
		log.Printf("handlePostQuestion ExecContext error: %v", err)
		http.Error(w, "Save Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
