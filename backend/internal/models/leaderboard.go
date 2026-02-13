package models

type LeaderboardEntry struct {
	UserID string `json:"userId"`
	Name   string `json:"name,omitempty"`
	Color  string `json:"color,omitempty"`
	Count  int    `json:"count"`
}