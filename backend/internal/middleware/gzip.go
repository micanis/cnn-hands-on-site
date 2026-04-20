package middleware

import (
	"compress/gzip"
	"io"
	"net/http"
	"strings"
)

// gzipResponseWriter は http.ResponseWriter をラップし、gzip 圧縮を行う
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (grw gzipResponseWriter) Write(b []byte) (int, error) {
	return grw.Writer.Write(b)
}

// Gzip はクライアントが gzip を受け入れる場合にレスポンスを圧縮する
// ただしバイナリストリーミング（download-url）は除外する
func Gzip(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// ダウンロードエンドポイントは gzip をスキップ（大容量バイナリストリーミングのため）
		if strings.HasPrefix(r.URL.Path, "/api/download-url") {
			next.ServeHTTP(w, r)
			return
		}

		if !strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			next.ServeHTTP(w, r)
			return
		}

		gz, err := gzip.NewWriterLevel(w, gzip.BestSpeed)
		if err != nil {
			next.ServeHTTP(w, r)
			return
		}
		defer gz.Close()

		w.Header().Set("Content-Encoding", "gzip")
		w.Header().Set("Vary", "Accept-Encoding")
		w.Header().Del("Content-Length")

		next.ServeHTTP(gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
	})
}
