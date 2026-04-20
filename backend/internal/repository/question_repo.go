package repository

import (
	"context"
	"database/sql"
	"log"

	"portal-api/internal/model"
)

// QuestionRepository はQuestionのデータアクセスを抽象化するインターフェース
type QuestionRepository interface {
	List(ctx context.Context) ([]model.Question, error)
	Create(ctx context.Context, q model.Question) error
	Delete(ctx context.Context, id int) error
}

// questionRepo は QuestionRepository の PostgreSQL 実装
type questionRepo struct {
	db *sql.DB
}

// NewQuestionRepository は QuestionRepository の実装を生成する
func NewQuestionRepository(db *sql.DB) QuestionRepository {
	return &questionRepo{db: db}
}

func (r *questionRepo) List(ctx context.Context) ([]model.Question, error) {
	const query = `
		SELECT id, session, content,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY/MM/DD HH24:MI')
		FROM questions
		ORDER BY id DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	questions := make([]model.Question, 0)
	for rows.Next() {
		var q model.Question
		if err := rows.Scan(&q.ID, &q.Session, &q.Content, &q.CreatedAt); err != nil {
			log.Printf("questionRepo.List Scan error: %v", err)
			continue
		}
		questions = append(questions, q)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return questions, nil
}

func (r *questionRepo) Create(ctx context.Context, q model.Question) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO questions (session, content) VALUES ($1, $2)`,
		q.Session, q.Content,
	)
	return err
}

func (r *questionRepo) Delete(ctx context.Context, id int) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM questions WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}
