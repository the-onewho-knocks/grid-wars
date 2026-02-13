package service

import (
	"context"

	"grid-war/internal/models"
	"grid-war/internal/repository"
)

type UserService struct {
	users repository.UserRepository
}

func NewUserService(users repository.UserRepository) *UserService {
	return &UserService{users: users}
}

func (s *UserService) Register(ctx context.Context, user models.User) error {
	return s.users.Create(ctx, user)
}