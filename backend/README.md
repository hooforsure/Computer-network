# NetVerse Backend

Spring Boot API for the NetVerse Protocol Lab practice project.

## Requirements

- JDK 17
- Maven 3.9+
- MySQL 8.x or compatible database, or Docker Desktop

Docker is optional but recommended for development. Flyway runs database
migrations automatically when the backend starts.

## Database

### Option A: Docker MySQL

```powershell
cd ..
docker compose up -d mysql
cd backend
```

Default connection values:

- URL: `jdbc:mysql://localhost:3307/netverse_lab`
- username: `root`
- password: read from `NETVERSE_DB_PASSWORD`; set it locally and do not commit it

Create a local `.env` from the root example before running Docker Compose:

```powershell
cd ..
Copy-Item .env.example .env
```

Start the backend and Flyway will apply:

- `src/main/resources/db/migration/V1__init_schema.sql`
- `src/main/resources/db/migration/V2__seed_initial_data.sql`

When the schema changes later, add a new migration such as
`V3__add_packet_template_field.sql`. Do not edit old migrations after they have
run on a shared database.

### Option B: Existing Local MySQL

Override them when starting:

```powershell
$env:NETVERSE_DB_URL='jdbc:mysql://localhost:3306/netverse_lab?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai'
$env:NETVERSE_DB_USERNAME='root'
$env:NETVERSE_DB_PASSWORD='your-password'
mvn spring-boot:run
```

The files in `../docs/sql/` are kept for course submission and manual database
inspection. Normal development should rely on Flyway migrations.

## Run

```powershell
cd backend
mvn spring-boot:run
```

Health check:

```http
GET http://localhost:18083/api/health
```

## Main APIs

- `POST /api/dns/resolve`
- `GET /api/dns/cache`
- `DELETE /api/dns/cache`
- `POST /api/tcp/handshake`
- `POST /api/tcp/release`
- `POST /api/scenarios/web-visit`
- `GET /api/knowledge/points`
- `POST /api/knowledge/points`
- `PUT /api/knowledge/points/{id}`
- `DELETE /api/knowledge/points/{id}`
- `GET /api/knowledge/graph`
