package handler

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"mime"
	"net/http"
	"path/filepath"
	"time"

	"cloud.google.com/go/storage"
)

// StorageHandler はGCSファイル操作関連のHTTPハンドラー（単一責任の原則）
type StorageHandler struct {
	gcsClient  *storage.Client
	bucketName string
}

// NewStorageHandler は StorageHandler を生成する
func NewStorageHandler(gcsClient *storage.Client, bucketName string) *StorageHandler {
	return &StorageHandler{gcsClient: gcsClient, bucketName: bucketName}
}

// HandleDownload はGCSのオブジェクトをプロキシ配信する
// (GET /api/download-url?filename=xxx&action=download)
//
// 大容量ファイル対応:
//   - io.CopyBuffer で 32KB バッファを使用しメモリ効率を改善
//   - http.ResponseWriter は既にチャンク転送に対応しているため
//     ファイルサイズによらずストリーミング配信できる
func (h *StorageHandler) HandleDownload(w http.ResponseWriter, r *http.Request) {
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
	obj := h.gcsClient.Bucket(h.bucketName).Object(fileName)
	rc, err := obj.NewReader(ctx)
	if err != nil {
		log.Printf("StorageHandler.HandleDownload GCS Read error (file=%s): %v", fileName, err)
		http.Error(w, "File not found", http.StatusNotFound)
		return
	}
	defer rc.Close()

	// Content-Type: 拡張子で判別、不明な場合はバイナリとして扱う
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
		log.Printf("StorageHandler.HandleDownload CopyBuffer warning (file=%s): %v", fileName, err)
	}
}

// HandleUploadURL はGCSへの署名付きアップロードURLを発行する
// (GET /api/upload-url?filename=xxx&contentType=xxx)
func (h *StorageHandler) HandleUploadURL(w http.ResponseWriter, r *http.Request) {
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

	url, err := h.gcsClient.Bucket(h.bucketName).SignedURL(fileName, opts)
	if err != nil {
		log.Printf("StorageHandler.HandleUploadURL error: %v", err)
		http.Error(w, "Failed to generate upload URL", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"uploadUrl": url})
}
