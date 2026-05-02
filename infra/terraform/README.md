# Pailo Terraform Infrastructure

This Terraform root provisions the launch AWS infrastructure for the internal Pailo factory app.

Default region: `ap-south-1` for Nepal latency.

## What It Creates

- VPC with two public and two private subnets.
- Public Application Load Balancer with HTTPS when DNS is enabled.
- One ECS Fargate service with frontend and backend containers in one task.
- ECR repositories for frontend and backend images.
- Private RDS PostgreSQL with generated master password in Secrets Manager.
- Private S3 bucket for product photos, employee documents, label assets, generated label PDFs, exports, and temporary uploads.
- Cognito user pool and web app client.
- Route 53 app record and ACM DNS-validated certificate when DNS is enabled.
- CloudWatch log groups, launch alarms, SSM configuration parameters, and a monthly AWS Budget.

## First Use

Read [../README.md](../README.md) first if this is your first AWS or Terraform deployment. It walks through root account setup, AWS CLI SSO, Terraform state bootstrap, first apply, and GitHub Actions variables.

Bootstrap remote state first:

```powershell
cd infra/terraform/bootstrap
terraform init
terraform apply
terraform output -raw backend_tf | Set-Content ..\backend.tf
```

Then configure and run the main root:

```powershell
cd infra/terraform
copy terraform.tfvars.example terraform.tfvars
terraform init
terraform fmt -recursive
terraform validate
terraform plan
```

Edit `terraform.tfvars` before applying. Do not commit `terraform.tfvars`; it may contain account-specific or sensitive values.

## State

Local state is acceptable only for early experimentation. Before production apply, create a dedicated S3 state bucket and DynamoDB lock table, copy `backend.tf.example` to `backend.tf`, and replace its placeholder names.

The `bootstrap` root automates that state bucket and lock table creation and prints the backend block for you.

## GitHub Actions

The main root creates `github_actions_role_arn`, an IAM role trusted by GitHub OIDC for this repository. Add that output as the GitHub repository variable `AWS_ROLE_ARN` after the first local Terraform apply.

## Deployment Notes

- The default launch posture avoids NAT Gateway cost by running Fargate tasks in public subnets with public IPs, while allowing inbound traffic only from the ALB security group.
- RDS is in private subnets and only accepts PostgreSQL traffic from the ECS task security group.
- The app keeps frontend and backend as separate containers in one ECS task definition to preserve code/runtime boundaries while minimizing launch cost.
- Push ARM64-compatible images to the output ECR repository URLs before the first successful ECS deployment.
