package repository

import (
	"context"
	"database/sql"
	"log"

	"portal-api/internal/model"
)

// SurveyRepository はアンケートのデータアクセスを抽象化するインターフェース
type SurveyRepository interface {
	ListActive(ctx context.Context) ([]model.Survey, error)
	GetByID(ctx context.Context, id int) (*model.Survey, error)
	Create(ctx context.Context, s model.Survey) error
	Update(ctx context.Context, id int, s model.Survey) error
	Delete(ctx context.Context, id int) error
	Respond(ctx context.Context, resp model.SurveyResponse) error
	ListResponses(ctx context.Context, surveyID int) ([]model.SurveyResponse, error)
	HasResponded(ctx context.Context, surveyID int, email string) (bool, error)
}

type surveyRepo struct {
	db *sql.DB
}

func NewSurveyRepository(db *sql.DB) SurveyRepository {
	return &surveyRepo{db: db}
}

func (r *surveyRepo) ListActive(ctx context.Context) ([]model.Survey, error) {
	const query = `
		SELECT id, title, COALESCE(description,''), questions, is_active,
		       TO_CHAR(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY/MM/DD HH24:MI')
		FROM surveys
		WHERE is_active = true
		ORDER BY id DESC`

	rows, err := r.db.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	surveys := make([]model.Survey, 0)
	for rows.Next() {
		var s model.Survey
		if err := rows.Scan(&s.ID, &s.Title, &s.Description, &s.Questions, &s.IsActive, &s.CreatedAt); err != nil {
			log.Printf("surveyRepo.ListActive Scan error: %v", err)
			continue
		}
		surveys = append(surveys, s)
	}
	return surveys, rows.Err()
}

func (r *surveyRepo) GetByID(ctx context.Context, id int) (*model.Survey, error) {
	var s model.Survey
	err := r.db.QueryRowContext(ctx,
		`SELECT id, title, COALESCE(description,''), questions, is_active,
		        TO_CHAR(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY/MM/DD HH24:MI')
		 FROM surveys WHERE id = $1`, id,
	).Scan(&s.ID, &s.Title, &s.Description, &s.Questions, &s.IsActive, &s.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &s, nil
}

func (r *surveyRepo) Create(ctx context.Context, s model.Survey) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO surveys (title, description, questions) VALUES ($1, $2, $3)`,
		s.Title, s.Description, s.Questions,
	)
	return err
}

func (r *surveyRepo) Update(ctx context.Context, id int, s model.Survey) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE surveys SET title = $1, description = $2, questions = $3, is_active = $4 WHERE id = $5`,
		s.Title, s.Description, s.Questions, s.IsActive, id,
	)
	return err
}

func (r *surveyRepo) Delete(ctx context.Context, id int) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM surveys WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rowsAffected, _ := result.RowsAffected()
	if rowsAffected == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *surveyRepo) Respond(ctx context.Context, resp model.SurveyResponse) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO survey_responses (survey_id, user_email, answers)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (survey_id, user_email) DO UPDATE SET answers = $3`,
		resp.SurveyID, resp.UserEmail, resp.Answers,
	)
	return err
}

func (r *surveyRepo) ListResponses(ctx context.Context, surveyID int) ([]model.SurveyResponse, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT id, survey_id, user_email, answers,
		        TO_CHAR(created_at AT TIME ZONE 'Asia/Tokyo', 'YYYY/MM/DD HH24:MI')
		 FROM survey_responses WHERE survey_id = $1 ORDER BY id DESC`, surveyID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	responses := make([]model.SurveyResponse, 0)
	for rows.Next() {
		var r model.SurveyResponse
		if err := rows.Scan(&r.ID, &r.SurveyID, &r.UserEmail, &r.Answers, &r.CreatedAt); err != nil {
			log.Printf("surveyRepo.ListResponses Scan error: %v", err)
			continue
		}
		responses = append(responses, r)
	}
	return responses, rows.Err()
}

func (r *surveyRepo) HasResponded(ctx context.Context, surveyID int, email string) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx,
		`SELECT EXISTS(SELECT 1 FROM survey_responses WHERE survey_id = $1 AND user_email = $2)`,
		surveyID, email,
	).Scan(&exists)
	return exists, err
}
