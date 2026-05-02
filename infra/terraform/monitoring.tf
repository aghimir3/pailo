resource "aws_cloudwatch_metric_alarm" "alb_5xx" {
  alarm_description   = "ALB 5xx responses are above the launch threshold."
  alarm_name          = "${local.name_prefix}-alb-5xx"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  dimensions = {
    LoadBalancer = aws_lb.app.arn_suffix
  }
  evaluation_periods = 2
  metric_name        = "HTTPCode_ELB_5XX_Count"
  namespace          = "AWS/ApplicationELB"
  period             = 300
  statistic          = "Sum"
  threshold          = 5
}

resource "aws_cloudwatch_metric_alarm" "ecs_cpu" {
  alarm_description   = "ECS service CPU utilization is high."
  alarm_name          = "${local.name_prefix}-ecs-cpu"
  comparison_operator = "GreaterThanThreshold"
  dimensions = {
    ClusterName = aws_ecs_cluster.main.name
    ServiceName = aws_ecs_service.app.name
  }
  evaluation_periods = 3
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ECS"
  period             = 300
  statistic          = "Average"
  threshold          = 75
}

resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_description   = "RDS CPU utilization is high."
  alarm_name          = "${local.name_prefix}-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
  evaluation_periods = 3
  metric_name        = "CPUUtilization"
  namespace          = "AWS/RDS"
  period             = 300
  statistic          = "Average"
  threshold          = 75
}

resource "aws_cloudwatch_metric_alarm" "rds_storage" {
  alarm_description   = "RDS free storage is below 5 GiB."
  alarm_name          = "${local.name_prefix}-rds-storage"
  comparison_operator = "LessThanThreshold"
  dimensions = {
    DBInstanceIdentifier = aws_db_instance.main.identifier
  }
  evaluation_periods = 2
  metric_name        = "FreeStorageSpace"
  namespace          = "AWS/RDS"
  period             = 300
  statistic          = "Average"
  threshold          = 5368709120
}

resource "aws_budgets_budget" "monthly" {
  budget_type  = "COST"
  limit_amount = var.monthly_budget_limit_usd
  limit_unit   = "USD"
  name         = "${local.name_prefix}-monthly-cost"
  time_unit    = "MONTHLY"

  dynamic "notification" {
    for_each = length(var.budget_alert_emails) > 0 ? [1] : []

    content {
      comparison_operator        = "GREATER_THAN"
      notification_type          = "FORECASTED"
      subscriber_email_addresses = var.budget_alert_emails
      threshold                  = 80
      threshold_type             = "PERCENTAGE"
    }
  }
}
