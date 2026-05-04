resource "aws_security_group" "alb" {
  description = "Public ALB ingress for the Pailo factory app"
  name        = "${local.name_prefix}-alb"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-alb"
  }
}

resource "aws_security_group" "ecs" {
  description = "ECS task ingress only from the ALB"
  name        = "${local.name_prefix}-ecs"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-ecs"
  }
}

resource "aws_security_group" "database" {
  description = "RDS PostgreSQL ingress only from ECS tasks"
  name        = "${local.name_prefix}-database"
  vpc_id      = aws_vpc.main.id

  tags = {
    Name = "${local.name_prefix}-database"
  }
}

resource "aws_vpc_security_group_ingress_rule" "alb_http" {
  for_each = toset(var.allowed_http_cidr_blocks)

  cidr_ipv4         = each.value
  from_port         = 80
  ip_protocol       = "tcp"
  security_group_id = aws_security_group.alb.id
  to_port           = 80
}

resource "aws_vpc_security_group_ingress_rule" "alb_https" {
  for_each = toset(var.allowed_https_cidr_blocks)

  cidr_ipv4         = each.value
  from_port         = 443
  ip_protocol       = "tcp"
  security_group_id = aws_security_group.alb.id
  to_port           = 443
}

resource "aws_vpc_security_group_egress_rule" "alb_to_frontend" {
  from_port                    = 3000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
  security_group_id            = aws_security_group.alb.id
  to_port                      = 3000
}

resource "aws_vpc_security_group_egress_rule" "alb_to_backend" {
  from_port                    = 8000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
  security_group_id            = aws_security_group.alb.id
  to_port                      = 8000
}

resource "aws_vpc_security_group_ingress_rule" "ecs_frontend" {
  from_port                    = 3000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
  security_group_id            = aws_security_group.ecs.id
  to_port                      = 3000
}

resource "aws_vpc_security_group_ingress_rule" "ecs_backend" {
  from_port                    = 8000
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.alb.id
  security_group_id            = aws_security_group.ecs.id
  to_port                      = 8000
}

resource "aws_vpc_security_group_egress_rule" "ecs_all" {
  cidr_ipv4         = "0.0.0.0/0"
  ip_protocol       = "-1"
  security_group_id = aws_security_group.ecs.id
}

resource "aws_vpc_security_group_ingress_rule" "database_postgres" {
  from_port                    = 5432
  ip_protocol                  = "tcp"
  referenced_security_group_id = aws_security_group.ecs.id
  security_group_id            = aws_security_group.database.id
  to_port                      = 5432
}

resource "random_password" "internal_service_token" {
  length  = 48
  special = false
}
