.PHONY: help dev build up down logs restart clean test

help: ## 显示帮助信息
	@echo "可用命令:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'

dev-backend: ## 启动后端开发服务器
	@echo "启动后端服务..."
	@cd backend && ./start.sh

dev-frontend: ## 启动前端开发服务器
	@echo "启动前端服务..."
	@cd frontend && npm install && npm run dev

dev: ## 启动开发环境（本地）
	@echo "请分别启动后端和前端："
	@echo "  后端: make dev-backend"
	@echo "  前端: make dev-frontend"

build: ## 构建 Docker 镜像
	docker-compose build

up: ## 启动所有服务
	docker-compose up -d

down: ## 停止所有服务
	docker-compose down

logs: ## 查看所有服务日志
	docker-compose logs -f

logs-api: ## 查看 API 服务日志
	docker-compose logs -f api

logs-web: ## 查看 Web 服务日志
	docker-compose logs -f web

logs-db: ## 查看数据库日志
	docker-compose logs -f postgres

restart: ## 重启所有服务
	docker-compose restart

restart-api: ## 重启 API 服务
	docker-compose restart api

restart-web: ## 重启 Web 服务
	docker-compose restart web

clean: ## 清理未使用的 Docker 资源
	docker-compose down -v
	docker system prune -f

test-api: ## 运行后端测试
	cd backend && python -m pytest

test-frontend: ## 运行前端测试
	cd frontend && npm test

verify: ## 验证配置
	@echo "验证数据库连接..."
	@cd backend && python scripts/verify_db.py
	@echo "验证 RustFS 连接..."
	@cd backend && python scripts/verify_rustfs.py

backup-db: ## 备份数据库
	@echo "备份数据库..."
	@docker-compose exec postgres pg_dump -U postgres aigc_vault > backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "备份完成"

restore-db: ## 恢复数据库（需要指定文件，如: make restore-db FILE=backup.sql）
	@if [ -z "$(FILE)" ]; then echo "请指定备份文件: make restore-db FILE=backup.sql"; exit 1; fi
	@echo "恢复数据库..."
	@docker-compose exec -T postgres psql -U postgres aigc_vault < $(FILE)
	@echo "恢复完成"

shell-api: ## 进入 API 容器 shell
	docker-compose exec api bash

shell-db: ## 进入数据库容器 shell
	docker-compose exec postgres psql -U postgres -d aigc_vault

