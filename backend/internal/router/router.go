package router

import (
	"net/http"

	"portal-api/internal/handler"
	"portal-api/internal/middleware"
)

// New はルーティングを定義し、ミドルウェアを適用した http.Handler を返す
// ルーティングの一元管理（開放閉鎖の原則: 新エンドポイント追加時はここに1行追加するだけ）
func New(
	materialHandler *handler.MaterialHandler,
	questionHandler *handler.QuestionHandler,
	storageHandler *handler.StorageHandler,
	surveyHandler *handler.SurveyHandler,
) http.Handler {
	mux := http.NewServeMux()

	// --- Materials CRUD ---
	mux.HandleFunc("GET /api/materials", materialHandler.HandleList)
	mux.HandleFunc("POST /api/materials", materialHandler.HandleCreate)
	mux.HandleFunc("PUT /api/materials/{id}", materialHandler.HandleUpdate)
	mux.HandleFunc("DELETE /api/materials/{id}", materialHandler.HandleDelete)

	// 後方互換: フロントエンドの既存パスをサポート
	mux.HandleFunc("POST /api/save-material", materialHandler.HandleCreate)

	// --- Questions CRUD ---
	mux.HandleFunc("GET /api/questions", questionHandler.HandleList)
	mux.HandleFunc("POST /api/questions", questionHandler.HandleCreate)
	mux.HandleFunc("DELETE /api/questions/{id}", questionHandler.HandleDelete)

	// 後方互換: フロントエンドの既存パスをサポート
	mux.HandleFunc("POST /api/ask-question", questionHandler.HandleCreate)

	// --- Surveys CRUD ---
	mux.HandleFunc("GET /api/surveys", surveyHandler.HandleListActive)
	mux.HandleFunc("POST /api/surveys", surveyHandler.HandleCreate)
	mux.HandleFunc("PUT /api/surveys/{id}", surveyHandler.HandleUpdate)
	mux.HandleFunc("DELETE /api/surveys/{id}", surveyHandler.HandleDelete)
	mux.HandleFunc("POST /api/surveys/{id}/respond", surveyHandler.HandleRespond)
	mux.HandleFunc("GET /api/surveys/{id}/responses", surveyHandler.HandleListResponses)
	mux.HandleFunc("GET /api/surveys/{id}/check", surveyHandler.HandleCheckResponse)

	// --- Storage ---
	mux.HandleFunc("GET /api/download-url", storageHandler.HandleDownload)
	mux.HandleFunc("GET /api/upload-url", storageHandler.HandleUploadURL)

	// ミドルウェアチェーン: CORS → Gzip → Handler
	return middleware.CORS(middleware.Gzip(mux))
}
