package repository

import (
	"context"
	"database/sql"
	"log"

	"portal-api/internal/model"
)

// MaterialRepository はMaterialのデータアクセスを抽象化するインターフェース（依存性逆転の原則）
type MaterialRepository interface {
	List(ctx context.Context, category string) ([]model.Material, error)
	Create(ctx context.Context, m model.Material) error
	Update(ctx context.Context, id int, m model.Material) error
	Delete(ctx context.Context, id int) (string, error) // filePath を返す（GCS削除用）
}

// materialRepo は MaterialRepository の PostgreSQL 実装
type materialRepo struct {
	db *sql.DB
}

// NewMaterialRepository は MaterialRepository の実装を生成する
func NewMaterialRepository(db *sql.DB) MaterialRepository {
	return &materialRepo{db: db}
}

func (r *materialRepo) List(ctx context.Context, category string) ([]model.Material, error) {
	const baseQuery = `SELECT id, title, pages, category, file_path FROM materials`

	var (
		rows *sql.Rows
		err  error
	)

	if category != "" {
		rows, err = r.db.QueryContext(ctx, baseQuery+` WHERE category = $1 ORDER BY id ASC`, category)
	} else {
		rows, err = r.db.QueryContext(ctx, baseQuery+` ORDER BY id ASC`)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	materials := make([]model.Material, 0)
	for rows.Next() {
		var m model.Material
		if err := rows.Scan(&m.ID, &m.Title, &m.Pages, &m.Category, &m.FilePath); err != nil {
			log.Printf("materialRepo.List Scan error: %v", err)
			continue
		}
		materials = append(materials, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return materials, nil
}

func (r *materialRepo) Create(ctx context.Context, m model.Material) error {
	_, err := r.db.ExecContext(ctx,
		`INSERT INTO materials (title, pages, category, file_path) VALUES ($1, $2, $3, $4)`,
		m.Title, m.Pages, m.Category, m.FilePath,
	)
	return err
}

func (r *materialRepo) Update(ctx context.Context, id int, m model.Material) error {
	_, err := r.db.ExecContext(ctx,
		`UPDATE materials SET title = $1, category = $2 WHERE id = $3`,
		m.Title, m.Category, id,
	)
	return err
}

// Delete は教材を削除し、GCS削除に必要な file_path を返す
func (r *materialRepo) Delete(ctx context.Context, id int) (string, error) {
	var filePath string
	err := r.db.QueryRowContext(ctx,
		`DELETE FROM materials WHERE id = $1 RETURNING file_path`, id,
	).Scan(&filePath)
	if err != nil {
		return "", err
	}
	return filePath, nil
}
