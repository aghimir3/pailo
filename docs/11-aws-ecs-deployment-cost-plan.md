# Pailo AWS ECS Deployment And Cost Plan

## Goal

Deploy Pailo on AWS ECS containers in a way that is reliable, snappy, and cost-conscious for about 5 active users/day at launch.

The design should avoid expensive infrastructure until the factory actually needs it.

## Recommended Launch Architecture

Use ECS Fargate with separate frontend and backend containers in one ECS task definition.

This preserves separation while saving money.

```text
Route 53 + ACM TLS certificate for app.pailoshoes.com
  |
Application Load Balancer
  |-- /*      -> frontend container port 3000
  |-- /api/* -> backend container port 8000
  |
ECS Fargate service: pailo-app
  |-- frontend container: Next.js standalone server
  |-- backend container: FastAPI/Uvicorn

RDS PostgreSQL: private subnet
S3 private bucket: photos, documents, label PDFs
Cognito: authentication
CloudWatch: logs and alarms
ECR: container images
```

## Why One ECS Service At Launch

Normally frontend and backend can be separate ECS services. For Pailo's launch usage, that adds cost and operations without much benefit.

Start with:

- One ECS cluster.
- One ECS service.
- One task definition.
- Two application containers.
- One ALB.
- Two target groups.
- Desired count: 1.

Split later when:

- More employees use it all day.
- Deploying frontend/backend independently matters.
- Backend jobs compete with UI traffic.
- You need separate scaling rules.

## AWS Region

Recommended primary region: `ap-south-1` Mumbai.

Reasoning:

- Good latency from Nepal.
- Mature AWS services.
- Usually more cost-effective than distant regions for South Asia.

Validate actual latency from the factory internet connection before production launch.

## Domain And DNS Plan

Pailo owns `pailoshoes.com`.

Recommended launch DNS:

- `app.pailoshoes.com`: internal factory app, pointed to the Application Load Balancer.
- `pailoshoes.com`: reserved for the future public brand site or a simple coming-soon page.
- `www.pailoshoes.com`: redirect to `pailoshoes.com` once the public site exists.
- `api.pailoshoes.com`: optional later; avoid at launch unless a separate API domain is truly needed.

AWS setup:

- Create a Route 53 hosted zone for `pailoshoes.com`, or point existing registrar nameservers to Route 53.
- Request an ACM certificate in the same region as the ALB for `app.pailoshoes.com`.
- If CloudFront is used for the future public site, request the CloudFront certificate in `us-east-1`.
- Add Cognito callback/logout URLs for `https://app.pailoshoes.com`.
- Set production CORS to allow only `https://app.pailoshoes.com` if the API ever moves to a separate subdomain.
- Set up SPF, DKIM, and DMARC before sending email from addresses like `admin@pailoshoes.com` or `support@pailoshoes.com`.

## Network Plan

Use a VPC with public and private subnets.

Launch cost-saving option:

- ALB in public subnets.
- ECS Fargate tasks in public subnets with public IP enabled.
- Fargate security group allows inbound only from ALB security group.
- RDS in private subnets.
- RDS security group allows inbound only from ECS task security group.

This avoids NAT Gateway cost. NAT Gateway can cost more than the small app compute for low traffic.

More locked-down future option:

- ECS tasks in private subnets.
- NAT Gateway or VPC endpoints for ECR, CloudWatch, Secrets Manager, and S3.
- Higher baseline cost, stronger private-network posture.

## Compute Sizing

AWS Fargate requires task-level CPU and memory. AWS guidance says size the task by summing container reservations and rounding up to a supported Fargate size.

Launch task target:

```text
Task CPU:    0.5 vCPU
Task memory: 1 GB
Architecture: ARM64/Graviton if image compatibility is clean
Desired tasks: 1
Max tasks: 2 later if autoscaling is enabled
```

Container reservations:

```text
frontend: 0.25 vCPU, 384 MB
backend:  0.25 vCPU, 512 MB
```

If Next.js runtime or PDF generation needs more memory, move to:

```text
Task CPU:    1 vCPU
Task memory: 2 GB
```

Keep PDF/image processing small at launch. If PDF jobs become heavy, move them to a separate worker task.

## Scaling Plan

Launch:

- Desired count: 1.
- No autoscaling unless needed.
- Deployment can temporarily run 2 tasks for zero-downtime replacement.

Optional autoscaling:

- Min tasks: 1.
- Max tasks: 2.
- Target CPU: 60 to 70 percent.
- Target memory: 70 to 80 percent.
- Cooldowns conservative.

Do not scale to zero for the web app if snappy login matters. Cold starts would make the app feel slow.

## Database Plan On AWS

Use Amazon RDS for PostgreSQL.

Launch option:

- Single-AZ RDS PostgreSQL.
- Small burstable Graviton instance class if supported, such as `db.t4g.micro` or `db.t4g.small`.
- gp3 storage, 20 GB to start.
- Storage autoscaling enabled with a reasonable cap.
- Automated backups enabled.
- Encryption enabled.
- Public access disabled.

Do not start with Aurora unless you specifically need Aurora features. For 5 active users/day, standard RDS PostgreSQL is simpler and cheaper.

Upgrade later:

- Multi-AZ.
- Larger instance.
- Read replica only if reporting load demands it.
- Performance Insights if query debugging needs it and budget allows.

## Storage Plan

Use S3 for:

- Product photos.
- Employee documents.
- Supplier documents.
- QC photos.
- Label template assets.
- Generated label PDFs.
- Exports and backups.

Settings:

- Private bucket.
- Block Public Access on.
- ACLs disabled.
- Server-side encryption on.
- Lifecycle rules for old generated PDFs and temporary uploads.
- Signed URLs from backend.

Use S3 Standard at launch. Add lifecycle transitions later for old documents/PDFs.

## Authentication

Use Amazon Cognito to avoid building password storage, password resets, MFA, and login security from scratch.

Plan:

- Cognito User Pool.
- Email or phone login depending on team preference.
- MFA optional for owner/admin.
- Backend verifies JWT.
- Local database stores app roles and employee mapping.

## Secrets And Configuration

Budget-friendly launch:

- Use SSM Parameter Store SecureString for most secrets.
- Use IAM task roles for S3 and AWS API permissions.
- Use environment variables only for non-secret configuration.

Use Secrets Manager when:

- Automatic DB credential rotation is needed.
- Secret lifecycle management becomes important.

## CI/CD

Recommended pipeline:

1. Pull request runs checks and tests.
2. Main branch builds frontend and backend images.
3. Push images to ECR.
4. Run Alembic migration as one-off ECS task.
5. Update ECS service task definition.
6. ECS deployment circuit breaker rolls back failed deployments.
7. Smoke test `/health` and `/api/v1/health`.

Use GitHub Actions or AWS CodePipeline. GitHub Actions is usually simpler to start.

## Logging And Monitoring

Launch:

- CloudWatch log groups for frontend and backend.
- 14-day retention.
- Alarms for ECS task stopped, high 5xx count, RDS CPU, RDS storage, RDS connections.
- Sentry optional for application errors.

Avoid expensive observability stacks at launch. Use structured logs and add OpenTelemetry deeper tracing when debugging requires it.

## Cost Controls

Cost-saving defaults:

- One ALB shared by frontend/backend.
- One ECS Fargate task at idle.
- ARM64 images where possible.
- RDS single-AZ at launch.
- No NAT Gateway at launch; use public-subnet Fargate tasks with strict security groups.
- No ElastiCache at launch.
- No OpenSearch at launch.
- No Kubernetes.
- 14-day log retention.
- S3 lifecycle policies.
- AWS Budgets monthly alert.
- Tag every resource with `Project=Pailo`, `Environment=prod`, and `Owner=...`.

Services likely to dominate monthly cost:

- RDS instance.
- Application Load Balancer.
- ECS Fargate task runtime.
- CloudWatch logs if retention is too long or logs are too noisy.

For this low traffic, data transfer and S3 should be small.

## Security Groups

Suggested rules:

- ALB SG: inbound 443 from internet, outbound to ECS task SG.
- ECS task SG: inbound frontend/backend ports only from ALB SG, outbound HTTPS and PostgreSQL to RDS SG.
- RDS SG: inbound PostgreSQL only from ECS task SG.
- S3 access: IAM task role, not public network rules.

If ECS tasks are public-subnet tasks, do not allow direct inbound from internet. Security group should accept only ALB-origin traffic.

## Environments

Launch with two environments:

- `staging`: smaller, can be shut down outside work hours if needed.
- `prod`: always on.

Staging can use cheaper settings:

- Desired ECS count 0 when not in use.
- Tiny RDS or shared non-production database.
- Short log retention.

## Deployment Phases

### Phase 1: Lowest Practical Production Cost

- One ECS Fargate service.
- Frontend/backend separate containers in same task.
- RDS single-AZ.
- S3 private bucket.
- Cognito.
- ALB.
- CloudWatch.

### Phase 2: More Reliable Factory Dependency

- RDS Multi-AZ.
- ECS desired count 2 during work hours or always.
- CloudFront in front of ALB.
- Better alarms and dashboards.

### Phase 3: Scale And Separate

- Split frontend and backend ECS services.
- Add worker ECS service.
- Add Redis/Valkey if queues/cache justify it.
- Add WAF if public abuse or compliance demands it.

## Cost Review Rhythm

Review AWS costs weekly during the first month.

Watch:

- ALB hours and LCU usage.
- Fargate vCPU/memory hours.
- RDS instance hours and storage.
- NAT Gateway, if accidentally added.
- CloudWatch log ingestion and retention.
- S3 storage and requests.

Create a monthly budget alert immediately.
