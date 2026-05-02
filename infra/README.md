# Pailo Infrastructure Guide

This folder contains the AWS infrastructure for Pailo. It is written in Terraform and defaults to `ap-south-1` because the app will be used in Nepal.

The goal is to let you do a careful first setup once, then let GitHub Actions handle checks, image builds, Terraform plans, and ECS redeployments most of the time.

## What Is In This Folder

- `terraform/bootstrap`: one-time Terraform state bootstrap. It creates the S3 state bucket and DynamoDB lock table.
- `terraform`: main AWS app infrastructure: VPC, ALB, ECS Fargate, ECR, RDS PostgreSQL, S3, Cognito, Route 53/ACM, CloudWatch, SSM, AWS Budget, and a GitHub Actions OIDC role.

## First AWS Account Setup

You said you currently only have the AWS root email and password. Use root only for account setup, then stop using it for daily work.

1. Sign in to AWS as the root user.
2. Turn on MFA for the root user.
3. Set account alternate contacts and billing alerts in the AWS console.
4. Create an administrator identity for yourself. Recommended path:
   - Open IAM Identity Center.
   - Enable IAM Identity Center if it is not enabled.
   - Create a user for yourself.
   - Create or use an `AdministratorAccess` permission set.
   - Assign your user to the AWS account with that permission set.
5. Install AWS CLI v2 on this computer if it is not already installed.
6. Configure AWS CLI SSO:

```powershell
aws configure sso
aws sso login --profile pailo-admin
aws sts get-caller-identity --profile pailo-admin
```

7. Use that profile for Terraform in this terminal:

```powershell
$env:AWS_PROFILE = "pailo-admin"
$env:AWS_REGION = "ap-south-1"
```

Fallback if you cannot use IAM Identity Center yet: create a temporary IAM admin user with access keys, run `aws configure --profile pailo-admin`, and delete or rotate those access keys after GitHub OIDC is working. Do not use root access keys.

## Local Tooling

Terraform has been installed locally to:

```text
%USERPROFILE%\.local\bin\terraform.exe
```

Open a new terminal if `terraform` is not found, or run:

```powershell
$env:Path = "$env:USERPROFILE\.local\bin;$env:Path"
terraform -version
```

Expected version: `Terraform v1.15.1`.

## Step 1: Bootstrap Remote State

Run this once from your computer after AWS CLI auth works:

```powershell
cd infra/terraform/bootstrap
terraform init
terraform fmt
terraform validate
terraform apply
terraform output -raw backend_tf | Set-Content ..\backend.tf
```

This creates:

- S3 bucket for Terraform state.
- DynamoDB table for Terraform state locking.
- `infra/terraform/backend.tf` with the right backend config.

Commit `backend.tf` after checking it. It should not contain secrets.

## Step 2: Configure App Infrastructure Variables

```powershell
cd ..
copy terraform.tfvars.example terraform.tfvars
notepad terraform.tfvars
```

Good first values:

```hcl
aws_region  = "ap-south-1"
environment = "prod"

budget_alert_emails = ["your-email@example.com"]
```

If `pailoshoes.com` is not already delegated to Route 53, use one of these safe paths:

- Easiest first deploy: set `enable_dns = false`, deploy the app to the ALB URL, then enable DNS later.
- Full domain setup: let Terraform create the hosted zone, copy the output name servers to your domain registrar, wait for DNS delegation, then run the full apply again.
- Existing hosted zone: set `route53_zone_id = "..."` in `terraform.tfvars`.

Do not commit `terraform.tfvars`; it is intentionally ignored.

## Step 3: Create AWS Infrastructure

```powershell
terraform init
terraform fmt -recursive
terraform validate
terraform plan
terraform apply
terraform output
```

Important outputs:

- `app_url`: app URL, either `https://app.pailoshoes.com` or the ALB URL when DNS is disabled.
- `ecr_repository_urls`: where CI pushes frontend and backend images.
- `github_actions_role_arn`: IAM role GitHub Actions uses through OIDC.
- `route53_name_servers`: name servers to copy to the registrar if Terraform created the hosted zone.

## Step 4: Configure GitHub Actions

In GitHub, open the repository settings and add these repository variables under `Settings > Secrets and variables > Actions > Variables`:

```text
AWS_REGION=ap-south-1
AWS_ROLE_ARN=<github_actions_role_arn output>
ECS_CLUSTER=pailo-prod-cluster
ECS_SERVICE=pailo-prod-app
FRONTEND_ECR_REPOSITORY=pailo-prod/frontend
BACKEND_ECR_REPOSITORY=pailo-prod/backend
```

No long-lived AWS access key should be stored in GitHub. The Terraform-created role trusts GitHub OIDC for this repository.

## CI/CD Workflows

The repo now has these workflows:

- `Pailo Monorepo Quality Gates` in `.github/workflows/ci.yml`: runs frontend, backend, API contract, and Terraform static checks on pushes and pull requests.
- `Pailo AWS Infrastructure Terraform Plan And Apply` in `.github/workflows/terraform.yml`: plans Terraform changes on infra pull requests and main pushes. Manual `workflow_dispatch` with `apply=true` applies from `main`.
- `Pailo Production ECS Image Build And Deploy` in `.github/workflows/deploy.yml`: builds ARM64 frontend/backend Docker images, pushes `latest` and commit SHA tags to ECR, and forces ECS to redeploy.

Normal flow after first setup:

1. Push code to GitHub.
2. CI checks run automatically.
3. App image workflow builds and pushes images to ECR.
4. ECS pulls the new `latest` images during forced deployment.
5. For infrastructure changes, review the Terraform plan, then manually run the Terraform workflow with `apply=true` from `main`.

## Safety Notes

- Keep root MFA enabled and avoid using root except for account-level emergencies.
- Keep `enable_deletion_protection = true` for production.
- Keep `skip_final_snapshot = false` for production databases.
- Review AWS costs weekly during the first month.
- The GitHub Actions role currently has `AdministratorAccess` so Terraform can manage the launch stack. Tighten this later once the infrastructure stabilizes.
