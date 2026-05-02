output "app_url" {
  description = "Primary URL for the Pailo internal factory app."
  value       = var.enable_dns ? "https://${local.app_domain_name}" : "http://${aws_lb.app.dns_name}"
}

output "aws_region" {
  description = "AWS region used by this Terraform root."
  value       = var.aws_region
}

output "cognito_client_id" {
  description = "Cognito user pool app client ID for the web app."
  value       = aws_cognito_user_pool_client.web.id
}

output "cognito_user_pool_id" {
  description = "Cognito user pool ID."
  value       = aws_cognito_user_pool.main.id
}

output "database_endpoint" {
  description = "RDS PostgreSQL endpoint for application configuration."
  value       = aws_db_instance.main.endpoint
}

output "database_secret_arn" {
  description = "Secrets Manager ARN for the RDS master user password."
  sensitive   = true
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "ecr_repository_urls" {
  description = "ECR repository URLs for application image pushes."
  value = {
    backend  = aws_ecr_repository.backend.repository_url
    frontend = aws_ecr_repository.frontend.repository_url
  }
}

output "ecs_cluster_name" {
  description = "ECS cluster name."
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.app.name
}

output "files_bucket_name" {
  description = "Private S3 bucket for photos, documents, label assets, and PDFs."
  value       = aws_s3_bucket.files.bucket
}

output "load_balancer_dns_name" {
  description = "Application Load Balancer DNS name."
  value       = aws_lb.app.dns_name
}

output "github_actions_role_arn" {
  description = "IAM role ARN for GitHub Actions OIDC deployments and Terraform workflows."
  value       = aws_iam_role.github_actions.arn
}

output "route53_name_servers" {
  description = "Name servers for the Route 53 zone when Terraform creates it. Empty when using an existing zone or DNS is disabled."
  value       = var.enable_dns && var.route53_zone_id == "" ? aws_route53_zone.main[0].name_servers : []
}
