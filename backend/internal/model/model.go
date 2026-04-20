package model

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
