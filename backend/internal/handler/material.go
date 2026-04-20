package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"cloud.google.com/go/storage"
	"portal-api/internal/model"
	"portal-api/internal/repository"
)

// MaterialHandler は教材関連のHTTPハンドラー（単一責任の原則）
type MaterialHandler struct {
	repo       repository.MaterialRepository
	gcsClient  *storage.Client
	bucketName string
}

// NewMaterialHandler は MaterialHandler を生成する（依存性逆転: interface に依存）
func NewMaterialHandler(repo repository.MaterialRepository, gcsClient *storage.Client, bucketName string) *MaterialHandler {
	return &MaterialHandler{repo: repo, gcsClient: gcsClient, bucketName: bucketName}
}

// HandleList は教材一覧を返す (GET /api/materials?category=xxx)
func (h *MaterialHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	category := r.URL.Query().Get("category")
	materials, err := h.repo.List(r.Context(), category)
	if err != nil {
		log.Printf("MaterialHandler.HandleList error: %v", err)
		http.Error(w, "DB Query Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(materials)
}

// HandleCreate は教材メタデータを保存する (POST /api/materials)
func (h *MaterialHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var m model.Material
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if m.Title == "" || m.Category == "" || m.FilePath == "" {
		http.Error(w, "title, category, file_path は必須です", http.StatusBadRequest)
		return
	}

	if err := h.repo.Create(r.Context(), m); err != nil {
		log.Printf("MaterialHandler.HandleCreate error: %v", err)
		http.Error(w, "Save Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleUpdate は教材メタデータを更新する (PUT /api/materials/{id})
func (h *MaterialHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var m model.Material
	if err := json.NewDecoder(r.Body).Decode(&m); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if m.Title == "" || m.Category == "" {
		http.Error(w, "title, category は必須です", http.StatusBadRequest)
		return
	}

	if err := h.repo.Update(r.Context(), id, m); err != nil {
		log.Printf("MaterialHandler.HandleUpdate error: %v", err)
		http.Error(w, "Update Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleDelete は教材を削除する (DELETE /api/materials/{id})
// DB レコードと GCS 上のファイルを両方削除する
func (h *MaterialHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// 1. DB から削除し、file_path を取得
	filePath, err := h.repo.Delete(ctx, id)
	if err != nil {
		log.Printf("MaterialHandler.HandleDelete DB error: %v", err)
		http.Error(w, "Delete Error", http.StatusInternalServerError)
		return
	}

	// 2. GCS からファイルを削除（ベストエフォート: 失敗してもDBは既に削除済み）
	if filePath != "" {
		obj := h.gcsClient.Bucket(h.bucketName).Object(filePath)
		if err := obj.Delete(ctx); err != nil {
			// GCS削除失敗はログに記録するがクライアントにはエラーを返さない
			// （DBレコードは既に削除されているため、孤立ファイルとして後で掃除可能）
			log.Printf("MaterialHandler.HandleDelete GCS warning (file=%s): %v", filePath, err)
		} else {
			log.Printf("GCS file deleted: %s", filePath)
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
