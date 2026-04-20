package model

import "encoding/json"

// Material は教材（スライド・アイテム）を表すデータモデル
type Material struct {
	ID       int    `json:"id"`
	Title    string `json:"title"`
	Pages    int    `json:"pages"`
	Category string `json:"category"`
	FilePath string `json:"file_path"`
}

// Question はQ&Aの質問を表すデータモデル
type Question struct {
	ID        int    `json:"id"`
	Session   string `json:"session"`
	Content   string `json:"content"`
	CreatedAt string `json:"created_at"`
}

// Survey はアンケート定義を表すデータモデル
// Questions フィールドは拡張可能な JSONB 形式:
//
//	[{"id":"q1","text":"授業は理解できましたか？","type":"binary","options":["はい","いいえ"]}]
//
// type は将来 "scale", "text", "multiple" 等に拡張可能
type Survey struct {
	ID          int             `json:"id"`
	Title       string          `json:"title"`
	Description string          `json:"description"`
	Questions   json.RawMessage `json:"questions"`
	IsActive    bool            `json:"is_active"`
	CreatedAt   string          `json:"created_at"`
}

// SurveyResponse はアンケート回答を表すデータモデル（非匿名）
type SurveyResponse struct {
	ID        int             `json:"id"`
	SurveyID  int             `json:"survey_id"`
	UserEmail string          `json:"user_email"`
	Answers   json.RawMessage `json:"answers"`
	CreatedAt string          `json:"created_at"`
}
