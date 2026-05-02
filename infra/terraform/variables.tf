variable "additional_cognito_callback_urls" {
  type        = list(string)
  description = "Additional Cognito OAuth callback URLs beyond the production app and localhost defaults."
  default     = []
}

variable "additional_cognito_logout_urls" {
  type        = list(string)
  description = "Additional Cognito OAuth logout URLs beyond the production app and localhost defaults."
  default     = []
}

variable "allowed_http_cidr_blocks" {
  type        = list(string)
  description = "IPv4 CIDR blocks allowed to reach the HTTP listener."
  default     = ["0.0.0.0/0"]
}

variable "allowed_https_cidr_blocks" {
  type        = list(string)
  description = "IPv4 CIDR blocks allowed to reach the HTTPS listener."
  default     = ["0.0.0.0/0"]
}

variable "app_subdomain" {
  type        = string
  description = "Subdomain for the internal factory app."
  default     = "app"
}

variable "availability_zone_count" {
  type        = number
  description = "Number of availability zones to use for public/private subnets."
  default     = 2

  validation {
    condition     = var.availability_zone_count >= 2 && var.availability_zone_count <= 3
    error_message = "Use two or three availability zones for the launch VPC."
  }
}

variable "aws_region" {
  type        = string
  description = "AWS region for all regional Pailo infrastructure. ap-south-1 is the default for Nepal latency."
  default     = "ap-south-1"
}

variable "backend_container_cpu" {
  type        = number
  description = "CPU units reserved for the backend container."
  default     = 256
}

variable "backend_container_memory" {
  type        = number
  description = "Memory in MiB reserved for the backend container."
  default     = 512
}

variable "backend_image" {
  type        = string
  description = "Optional fully-qualified backend container image. Defaults to the backend ECR repository plus image_tag."
  default     = ""
}

variable "budget_alert_emails" {
  type        = list(string)
  description = "Email addresses that should receive AWS Budget alerts. Leave empty to create the budget without notifications."
  default     = []
}

variable "cognito_domain_prefix" {
  type        = string
  description = "Optional globally-unique Cognito hosted UI domain prefix. Leave empty to skip creating a hosted UI domain."
  default     = ""
}

variable "database_allocated_storage_gb" {
  type        = number
  description = "Initial RDS PostgreSQL storage in GiB."
  default     = 20
}

variable "database_backup_retention_days" {
  type        = number
  description = "RDS automated backup retention in days."
  default     = 7
}

variable "database_instance_class" {
  type        = string
  description = "RDS PostgreSQL instance class for launch."
  default     = "db.t4g.micro"
}

variable "database_max_allocated_storage_gb" {
  type        = number
  description = "Maximum RDS storage autoscaling limit in GiB."
  default     = 100
}

variable "database_multi_az" {
  type        = bool
  description = "Whether to run RDS PostgreSQL as Multi-AZ. Keep false at launch for cost control."
  default     = false
}

variable "database_name" {
  type        = string
  description = "Initial PostgreSQL database name."
  default     = "pailo"
}

variable "database_username" {
  type        = string
  description = "RDS PostgreSQL master username. The password is generated and managed by RDS Secrets Manager integration."
  default     = "pailo_admin"
}

variable "desired_count" {
  type        = number
  description = "Desired number of ECS service tasks."
  default     = 1
}

variable "enable_container_insights" {
  type        = bool
  description = "Whether to enable ECS Container Insights. Disabled by default to keep launch costs down."
  default     = false
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Whether to enable deletion protection on production-sensitive resources such as ALB and RDS."
  default     = true
}

variable "enable_dns" {
  type        = bool
  description = "Whether to manage Route 53 app DNS and ACM certificate validation."
  default     = true
}

variable "enable_ecs_execute_command" {
  type        = bool
  description = "Whether to enable ECS Exec for the service."
  default     = false
}

variable "environment" {
  type        = string
  description = "Deployment environment name."
  default     = "prod"

  validation {
    condition     = contains(["staging", "prod"], var.environment)
    error_message = "Environment must be staging or prod."
  }
}

variable "force_destroy_buckets" {
  type        = bool
  description = "Whether Terraform may delete non-empty S3 buckets. Keep false for production."
  default     = false
}

variable "initial_owner_admin_email" {
  type        = string
  description = "Email address for the first Pailo owner/admin user. The backend uses this to bootstrap the initial owner_admin role after the Cognito user is invited."
  default     = ""
}

variable "frontend_container_cpu" {
  type        = number
  description = "CPU units reserved for the frontend container."
  default     = 256
}

variable "frontend_container_memory" {
  type        = number
  description = "Memory in MiB reserved for the frontend container."
  default     = 384
}

variable "frontend_image" {
  type        = string
  description = "Optional fully-qualified frontend container image. Defaults to the frontend ECR repository plus image_tag."
  default     = ""
}

variable "github_actions_allowed_refs" {
  type        = list(string)
  description = "GitHub OIDC subject patterns allowed to assume the Terraform/deploy role."
  default     = ["ref:refs/heads/main", "pull_request"]
}

variable "github_repository" {
  type        = string
  description = "GitHub repository in owner/name format for CI/CD OIDC trust."
  default     = "aghimir3/pailo"
}

variable "image_tag" {
  type        = string
  description = "Default image tag to deploy from the frontend and backend ECR repositories."
  default     = "latest"
}

variable "monthly_budget_limit_usd" {
  type        = string
  description = "Monthly AWS budget limit amount in USD."
  default     = "100"
}

variable "owner" {
  type        = string
  description = "Owner tag applied to AWS resources."
  default     = "Pailo Shoes"
}

variable "postgres_engine_version" {
  type        = string
  description = "RDS PostgreSQL engine version. Use a version available in the target region."
  default     = "17"
}

variable "project_name" {
  type        = string
  description = "Short project name used in AWS resource names."
  default     = "pailo"
}

variable "root_domain_name" {
  type        = string
  description = "Root domain name for Pailo."
  default     = "pailoshoes.com"
}

variable "route53_zone_id" {
  type        = string
  description = "Existing Route 53 hosted zone ID for root_domain_name. Leave empty to create a new public hosted zone."
  default     = ""
}

variable "skip_final_snapshot" {
  type        = bool
  description = "Whether RDS should skip a final snapshot on destroy. Keep false for production."
  default     = false
}

variable "tags" {
  type        = map(string)
  description = "Additional default tags applied through the AWS provider."
  default     = {}
}

variable "task_cpu" {
  type        = string
  description = "Fargate task CPU value. 512 equals 0.5 vCPU."
  default     = "512"
}

variable "task_memory" {
  type        = string
  description = "Fargate task memory value in MiB."
  default     = "1024"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the Pailo VPC."
  default     = "10.42.0.0/16"
}
