package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"portal-api/internal/model"
	"portal-api/internal/repository"
)

// QuestionHandler はQ&A関連のHTTPハンドラー（単一責任の原則）
type QuestionHandler struct {
	repo repository.QuestionRepository
}

// NewQuestionHandler は QuestionHandler を生成する
func NewQuestionHandler(repo repository.QuestionRepository) *QuestionHandler {
	return &QuestionHandler{repo: repo}
}

// HandleList は質問一覧を返す (GET /api/questions)
func (h *QuestionHandler) HandleList(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	questions, err := h.repo.List(r.Context())
	if err != nil {
		log.Printf("QuestionHandler.HandleList error: %v", err)
		http.Error(w, "DB Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	// 質問は即時反映が必要なためキャッシュしない
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(questions)
}

// HandleCreate は質問を投稿する (POST /api/questions)
func (h *QuestionHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	var q model.Question
	if err := json.NewDecoder(r.Body).Decode(&q); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if q.Session == "" || q.Content == "" {
		http.Error(w, "session と content は必須です", http.StatusBadRequest)
		return
	}

	if err := h.repo.Create(r.Context(), q); err != nil {
		log.Printf("QuestionHandler.HandleCreate error: %v", err)
		http.Error(w, "Save Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleDelete は質問を削除する (DELETE /api/questions/{id})
func (h *QuestionHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		log.Printf("QuestionHandler.HandleDelete error: %v", err)
		http.Error(w, "Delete Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}
