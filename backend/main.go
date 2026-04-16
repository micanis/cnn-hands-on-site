package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"time"

	"cloud.google.com/go/storage"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"

	credentials "cloud.google.com/go/iam/credentials/apiv1"
	"cloud.google.com/go/iam/credentials/apiv1/credentialspb"
)

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

func main() {
	log.Println("[Step 1] サーバー起動処理を開始します...")

	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: .envファイルが見つかりません。")
	} else {
		log.Println("[Step 2] .envファイルの読み込み完了")
	}

	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		log.Fatal("エラー: DATABASE_URL が設定されていません。")
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		log.Fatal("エラー: DBドライバーの準備に失敗しました:", err)
	}
	defer db.Close()

	log.Println("[Step 3] Neonデータベースに接続(Ping)を試みています...")
	if err := db.Ping(); err != nil {
		log.Fatal("エラー: データベースへのPingに失敗しました:", err)
	}
	log.Println("[Step 4] Neonデータベースへの接続成功！")

	// ==========================================
	// ルート1: スライド一覧を取得するAPI
	// ==========================================
	http.HandleFunc("/api/materials", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		category := r.URL.Query().Get("category")

		query := "SELECT id, title, pages, category, file_path FROM materials"
		var rows *sql.Rows
		var err error

		if category != "" {
			rows, err = db.Query(query+" WHERE category = $1 ORDER BY id ASC", category)
		} else {
			rows, err = db.Query(query + " ORDER BY id ASC")
		}

		if err != nil {
			http.Error(w, "Failed to query database", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var materials []Material
		for rows.Next() {
			var s Material
			// SQLで指定した5つのカラムすべてを受け取るように修正
			if err := rows.Scan(&s.ID, &s.Title, &s.Pages, &s.Category, &s.FilePath); err != nil {
				log.Println("Scan error:", err) // エラー内容をログに出すとデバッグしやすいです
				continue
			}
			materials = append(materials, s)
		}

		if materials == nil {
			materials = []Material{}
		}
		// スライドの配列をJSONで返す
		json.NewEncoder(w).Encode(materials)
	})

	http.HandleFunc("/api/save-material", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			return
		}

		var m Material
		if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// DBにインサート
		_, err := db.Exec(
			"INSERT INTO materials (title, pages, category, file_path) VALUES ($1, $2, $3, $4)",
			m.Title, m.Pages, m.Category, m.FilePath,
		)
		if err != nil {
			log.Println("DB保存エラー:", err)
			http.Error(w, "Failed to save metadata", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	})

	// ==========================================
	// ルート2: GCSのアップロード用署名付きURLを発行するAPI
	// ==========================================
	http.HandleFunc("/api/upload-url", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		// URLのクエリパラメータからファイル名を取得
		fileName := r.URL.Query().Get("filename")
		contentType := r.URL.Query().Get("contentType")

		if fileName == "" {
			http.Error(w, "filename is required", http.StatusBadRequest)
			return
		}

		// GCSバケット名
		bucketName := "cnn-hands-on-portal-storage"
		saEmail := os.Getenv("GCP_SA")

		ctx := context.Background()
		client, err := storage.NewClient(ctx)
		if err != nil {
			log.Println("GCS Error", err)
			http.Error(w, "Failed to create GCS client", http.StatusInternalServerError)
			return
		}
		defer client.Close()

		iamClient, err := credentials.NewIamCredentialsRESTClient(ctx)
		if err != nil {
			log.Println("IAMクライアント作成エラー:", err)
			http.Error(w, "Failed to create IAM client", http.StatusInternalServerError)
			return
		}
		defer iamClient.Close()

		signBytes := func(b []byte) ([]byte, error) {
			req := &credentialspb.SignBlobRequest{
				Name:    fmt.Sprintf("projects/-/serviceAccounts/%s", saEmail),
				Payload: b,
			}
			resp, err := iamClient.SignBlob(ctx, req)
			if err != nil {
				return nil, err
			}
			return resp.SignedBlob, nil
		}

		// 15分有効なPUT（アップロード用）のURL設定
		opts := &storage.SignedURLOptions{
			Method:         "PUT",
			Expires:        time.Now().Add(15 * time.Minute),
			ContentType:    contentType,
			GoogleAccessID: saEmail,
			SignBytes:      signBytes,
		}

		url, err := client.Bucket(bucketName).SignedURL(fileName, opts)
		if err != nil {
			log.Println("署名付きURL生成エラー:", err)
			http.Error(w, "Failed to generate signed URL", http.StatusInternalServerError)
			return
		}

		// URLとファイル名をJSONで返す
		response := map[string]string{
			"uploadUrl": url,
			"fileName":  fileName,
		}
		json.NewEncoder(w).Encode(response)

	})

	http.HandleFunc("/api/download-url", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")
		fileName := r.URL.Query().Get("filename")
		action := r.URL.Query().Get("action")
		if fileName == "" {
			http.Error(w, "filename is required", http.StatusBadRequest)
			return
		}
		bucketName := "cnn-hands-on-portal-storage" // バケット名
		saEmail := os.Getenv("GCP_SA")
		ctx := context.Background()
		client, err := storage.NewClient(ctx)
		if err != nil {
			http.Error(w, "Failed to create GCS client", http.StatusInternalServerError)
			return
		}
		defer client.Close()

		iamClient, err := credentials.NewIamCredentialsRESTClient(ctx)
		if err != nil {
			http.Error(w, "Failed to create IAM client", http.StatusInternalServerError)
			return
		}
		defer iamClient.Close()

		signBytes := func(b []byte) ([]byte, error) {
			req := &credentialspb.SignBlobRequest{
				Name:    fmt.Sprintf("projects/-/serviceAccounts/%s", saEmail),
				Payload: b,
			}
			resp, err := iamClient.SignBlob(ctx, req)
			if err != nil {
				return nil, err
			}
			return resp.SignedBlob, nil
		}

		queryParams := url.Values{}
		if action == "download" {
			// ダウンロードを強制する
			queryParams.Set("response-content-disposition", fmt.Sprintf("attachment; filename=\"%s\"", fileName))
		} else {
			// ブラウザでの閲覧を強制する（デフォルト）
			queryParams.Set("response-content-disposition", "inline")
		}
		// 1時間だけ有効な GET（ダウンロード用）のURLを発行
		opts := &storage.SignedURLOptions{
			Method:          "GET",
			Expires:         time.Now().Add(1 * time.Hour),
			GoogleAccessID:  saEmail,
			SignBytes:       signBytes,
			QueryParameters: queryParams,
		}

		url, err := client.Bucket(bucketName).SignedURL(fileName, opts)
		if err != nil {
			log.Println("署名付きURL生成エラー:", err)
			http.Error(w, "Failed to generate signed URL", http.StatusInternalServerError)
			return
		}

		// URLをJSONで返す
		json.NewEncoder(w).Encode(map[string]string{"downloadUrl": url})
	})
	// ==========================================
	// ルート4: 質問一覧を取得するAPI
	// ==========================================
	http.HandleFunc("/api/questions", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Content-Type", "application/json")

		// 最新の質問から順に取得（日本時間でフォーマット）
		query := `SELECT id, session, content, TO_CHAR(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY/MM/DD HH24:MI') FROM questions ORDER BY id DESC`
		rows, err := db.Query(query)
		if err != nil {
			http.Error(w, "Failed to query database", http.StatusInternalServerError)
			return
		}
		defer rows.Close()

		var questions []Question
		for rows.Next() {
			var q Question
			if err := rows.Scan(&q.ID, &q.Session, &q.Content, &q.CreatedAt); err != nil {
				continue
			}
			questions = append(questions, q)
		}

		if questions == nil {
			questions = []Question{}
		}
		json.NewEncoder(w).Encode(questions)
	})

	// ==========================================
	// ルート5: 新しい質問を保存するAPI
	// ==========================================
	http.HandleFunc("/api/ask-question", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		// CORSのプレフライトリクエスト対応
		if r.Method == "OPTIONS" {
			return
		}

		var q Question
		if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// DBにインサート
		_, err := db.Exec(
			"INSERT INTO questions (session, content) VALUES ($1, $2)",
			q.Session, q.Content,
		)
		if err != nil {
			log.Println("質問の保存エラー:", err)
			http.Error(w, "Failed to save question", http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]string{"status": "success"})
	})
	// サーバー起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("[Step 5] Go Server is running on http://localhost:%s...\n", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatal(err)
	}
}
