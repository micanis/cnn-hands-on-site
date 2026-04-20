package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"strconv"

	"portal-api/internal/model"
	"portal-api/internal/repository"
)

// SurveyHandler はアンケート関連のHTTPハンドラー
type SurveyHandler struct {
	repo repository.SurveyRepository
}

func NewSurveyHandler(repo repository.SurveyRepository) *SurveyHandler {
	return &SurveyHandler{repo: repo}
}

// HandleListActive はアクティブなアンケート一覧を返す (GET /api/surveys)
func (h *SurveyHandler) HandleListActive(w http.ResponseWriter, r *http.Request) {
	surveys, err := h.repo.ListActive(r.Context())
	if err != nil {
		log.Printf("SurveyHandler.HandleListActive error: %v", err)
		http.Error(w, "DB Query Error", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache, no-store, must-revalidate")
	json.NewEncoder(w).Encode(surveys)
}

// HandleCreate はアンケートを作成する (POST /api/surveys)
func (h *SurveyHandler) HandleCreate(w http.ResponseWriter, r *http.Request) {
	var s model.Survey
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if s.Title == "" || len(s.Questions) == 0 {
		http.Error(w, "title, questions は必須です", http.StatusBadRequest)
		return
	}

	if err := h.repo.Create(r.Context(), s); err != nil {
		log.Printf("SurveyHandler.HandleCreate error: %v", err)
		http.Error(w, "Save Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleUpdate はアンケートを更新する (PUT /api/surveys/{id})
func (h *SurveyHandler) HandleUpdate(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var s model.Survey
	if err := json.NewDecoder(r.Body).Decode(&s); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}

	if err := h.repo.Update(r.Context(), id, s); err != nil {
		log.Printf("SurveyHandler.HandleUpdate error: %v", err)
		http.Error(w, "Update Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleDelete はアンケートを削除する (DELETE /api/surveys/{id})
func (h *SurveyHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		log.Printf("SurveyHandler.HandleDelete error: %v", err)
		http.Error(w, "Delete Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleRespond はアンケートに回答する (POST /api/surveys/{id}/respond)
func (h *SurveyHandler) HandleRespond(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	var body struct {
		UserEmail string          `json:"user_email"`
		Answers   json.RawMessage `json:"answers"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		return
	}
	if body.UserEmail == "" || len(body.Answers) == 0 {
		http.Error(w, "user_email, answers は必須です", http.StatusBadRequest)
		return
	}

	resp := model.SurveyResponse{
		SurveyID:  id,
		UserEmail: body.UserEmail,
		Answers:   body.Answers,
	}

	if err := h.repo.Respond(r.Context(), resp); err != nil {
		log.Printf("SurveyHandler.HandleRespond error: %v", err)
		http.Error(w, "Save Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(map[string]string{"status": "success"})
}

// HandleListResponses は回答一覧を返す (GET /api/surveys/{id}/responses)
func (h *SurveyHandler) HandleListResponses(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	responses, err := h.repo.ListResponses(r.Context(), id)
	if err != nil {
		log.Printf("SurveyHandler.HandleListResponses error: %v", err)
		http.Error(w, "DB Query Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(responses)
}

// HandleCheckResponse はユーザーが回答済みか確認する (GET /api/surveys/{id}/check?email=xxx)
func (h *SurveyHandler) HandleCheckResponse(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil {
		http.Error(w, "Invalid ID", http.StatusBadRequest)
		return
	}

	email := r.URL.Query().Get("email")
	if email == "" {
		http.Error(w, "email は必須です", http.StatusBadRequest)
		return
	}

	responded, err := h.repo.HasResponded(r.Context(), id, email)
	if err != nil {
		log.Printf("SurveyHandler.HandleCheckResponse error: %v", err)
		http.Error(w, "DB Query Error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"responded": responded})
}
