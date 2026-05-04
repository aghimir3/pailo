resource "aws_cloudwatch_log_group" "frontend" {
  name              = "/ecs/${local.name_prefix}/frontend"
  retention_in_days = 14
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${local.name_prefix}/backend"
  retention_in_days = 14
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.enable_container_insights ? "enabled" : "disabled"
  }
}

resource "aws_ecs_task_definition" "app" {
  container_definitions = jsonencode([
    {
      cpu = var.frontend_container_cpu
      environment = concat(local.common_environment, [
        {
          name  = "NODE_ENV"
          value = "production"
        },
        {
          name  = "NEXT_PUBLIC_API_BASE_URL"
          value = "http://127.0.0.1:8000"
        },
        {
          name  = "PORT"
          value = "3000"
        }
      ])
      essential = true
      image     = local.frontend_image
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.frontend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "frontend"
        }
      }
      memory = var.frontend_container_memory
      name   = local.frontend_container_name
      portMappings = [
        {
          containerPort = 3000
          hostPort      = 3000
          protocol      = "tcp"
        }
      ]
    },
    {
      cpu = var.backend_container_cpu
      environment = concat(local.common_environment, [
        {
          name  = "COGNITO_CLIENT_ID"
          value = aws_cognito_user_pool_client.web.id
        },
        {
          name  = "COGNITO_USER_POOL_ID"
          value = aws_cognito_user_pool.main.id
        },
        {
          name  = "CORS_ORIGINS"
          value = "https://${local.app_domain_name}"
        },
        {
          name  = "INITIAL_OWNER_ADMIN_EMAIL"
          value = var.initial_owner_admin_email
        },
        {
          name  = "DATABASE_HOST"
          value = aws_db_instance.main.address
        },
        {
          name  = "DATABASE_NAME"
          value = var.database_name
        },
        {
          name  = "DATABASE_PORT"
          value = tostring(aws_db_instance.main.port)
        },
        {
          name  = "DATABASE_USERNAME"
          value = var.database_username
        },
        {
          name  = "S3_FILES_BUCKET"
          value = aws_s3_bucket.files.bucket
        }
      ])
      essential = true
      image     = local.backend_image
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.backend.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "backend"
        }
      }
      memory = var.backend_container_memory
      name   = local.backend_container_name
      portMappings = [
        {
          containerPort = 8000
          hostPort      = 8000
          protocol      = "tcp"
        }
      ]
      secrets = [
        {
          name      = "DATABASE_PASSWORD"
          valueFrom = "${aws_db_instance.main.master_user_secret[0].secret_arn}:password::"
        }
      ]
    }
  ])
  cpu                      = var.task_cpu
  execution_role_arn       = aws_iam_role.task_execution.arn
  family                   = "${local.name_prefix}-app"
  memory                   = var.task_memory
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    cpu_architecture        = "X86_64"
    operating_system_family = "LINUX"
  }
}

resource "aws_ecs_service" "app" {
  cluster                            = aws_ecs_cluster.main.id
  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100
  desired_count                      = var.desired_count
  enable_execute_command             = var.enable_ecs_execute_command
  launch_type                        = "FARGATE"
  name                               = "${local.name_prefix}-app"
  task_definition                    = aws_ecs_task_definition.app.arn

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  load_balancer {
    container_name   = local.frontend_container_name
    container_port   = 3000
    target_group_arn = aws_lb_target_group.frontend.arn
  }

  load_balancer {
    container_name   = local.backend_container_name
    container_port   = 8000
    target_group_arn = aws_lb_target_group.backend.arn
  }

  network_configuration {
    assign_public_ip = true
    security_groups  = [aws_security_group.ecs.id]
    subnets          = [for subnet in aws_subnet.public : subnet.id]
  }

  depends_on = [
    aws_lb_listener.http_forward,
    aws_lb_listener.http_redirect,
    aws_lb_listener.https,
    aws_lb_listener_rule.api_http,
    aws_lb_listener_rule.api_https,
  ]
}
