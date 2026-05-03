resource "aws_lb" "app" {
  enable_deletion_protection = var.enable_deletion_protection
  internal                   = false
  load_balancer_type         = "application"
  name                       = "${local.name_prefix}-app"
  security_groups            = [aws_security_group.alb.id]
  subnets                    = [for subnet in aws_subnet.public : subnet.id]

  tags = {
    Name = "${local.name_prefix}-app"
  }
}

resource "aws_lb_target_group" "frontend" {
  deregistration_delay = 30
  name                 = "${local.name_prefix}-frontend"
  port                 = 3000
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200-399"
    path                = "/"
    timeout             = 5
    unhealthy_threshold = 3
  }
}

resource "aws_lb_target_group" "backend" {
  deregistration_delay = 30
  name                 = "${local.name_prefix}-backend"
  port                 = 8000
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200-399"
    path                = "/health"
    timeout             = 5
    unhealthy_threshold = 3
  }
}

resource "aws_lb_listener" "http_redirect" {
  count = var.enable_dns ? 1 : 0

  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "http_forward" {
  count = var.enable_dns ? 0 : 1

  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    target_group_arn = aws_lb_target_group.frontend.arn
    type             = "forward"
  }
}

resource "aws_lb_listener" "https" {
  count = var.enable_dns ? 1 : 0

  certificate_arn   = aws_acm_certificate_validation.app[0].certificate_arn
  load_balancer_arn = aws_lb.app.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"

  default_action {
    target_group_arn = aws_lb_target_group.frontend.arn
    type             = "forward"
  }
}

resource "aws_lb_listener_rule" "www_redirect_https" {
  count = var.enable_dns ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 5

  action {
    type = "redirect"

    redirect {
      host        = local.public_domain_name
      path        = "/#{path}"
      port        = "443"
      protocol    = "HTTPS"
      query       = "#{query}"
      status_code = "HTTP_301"
    }
  }

  condition {
    host_header {
      values = [local.www_domain_name]
    }
  }
}

resource "aws_lb_listener_rule" "api_https" {
  count = var.enable_dns ? 1 : 0

  listener_arn = aws_lb_listener.https[0].arn
  priority     = 10

  action {
    target_group_arn = aws_lb_target_group.backend.arn
    type             = "forward"
  }

  condition {
    host_header {
      values = [local.app_domain_name]
    }
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health"]
    }
  }
}

resource "aws_lb_listener_rule" "api_http" {
  count = var.enable_dns ? 0 : 1

  listener_arn = aws_lb_listener.http_forward[0].arn
  priority     = 10

  action {
    target_group_arn = aws_lb_target_group.backend.arn
    type             = "forward"
  }

  condition {
    path_pattern {
      values = ["/api/*", "/health"]
    }
  }
}
