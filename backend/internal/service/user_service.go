package service

import (
	"context"

	"grid-war/internal/models"
	"grid-war/internal/repository"
)

type UserService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) *UserService {
	return &UserService{repo: repo}
}

func (s *UserService) Register(ctx context.Context, user models.User) error {
	return s.repo.Create(ctx, user)
}