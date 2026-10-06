<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Run with Docker Compose

From the repo root. Requires `backend/.env` (see `backend/.env.example`).

```bash
# 1. Point the app at the compose database (NOT a remote host)
# backend/.env must contain:
#   DATABASE_USER=admin
#   DATABASE_PASS=123
#   DATABASE_NAME=uni
#   DATABASE_URL=postgresql://admin:123@database:5432/uni

# 2. Build and start (migrate service pushes the schema automatically)
docker compose up --build -d

# 3. Seed faculties + test users (admin/entry, password: secret123)
docker compose exec backend bunx tsx seed_faculties.ts
docker compose exec backend bunx tsx seed_gr_test.ts

# 4. Verify: 401 without a token means the guards are up
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:4000/api/v1/auth/me

# 5. Run the endpoint suites
bash api_gr_test.sh http://localhost:4000/api/v1

# Stop (add -v to wipe the database volume)
docker compose down
```

> The production image prunes devDependencies, so seeds run via `bunx tsx`
> (fetched on the fly) — the `ts-node`-based `seed:*` scripts only work locally.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

## Sign-in portals and website content

### Deploying this change to an existing database

`drizzle-kit push` can't apply schema changes once `results` has rows, so apply
the hand-written migrations first, in order:

```bash
psql "$DATABASE_URL" -f drizzle/0015_user_roles.sql   # roles a user may hold several of, and their permissions
psql "$DATABASE_URL" -f drizzle/0016_site_pages.sql   # website pages and their saved versions
psql "$DATABASE_URL" -f drizzle/0017_domain_user_admins.sql   # user management split by domain
psql "$DATABASE_URL" -f drizzle/0018_site_pages_client_feedback.sql   # saved content moved to the changed leader, student affairs and libraries templates
```

All are safe to run twice. 0015 gives every existing user exactly the role
they had. The old per-page CMS tables (`main_page`, `about_page`, ...) are left
untouched and unused.

### Loading the website's content

The content the website showed before the CMS is kept in
`seed/site-content/` (27 pages and their images). Load it once:

```bash
bun run seed:site               # adds pages that have no content yet
bun run seed:site --overwrite   # also replaces pages that do, as a new version
```

In Docker: `docker compose exec backend bun run seed:site`. Images are copied
to `MEDIA_DIR/images`; the API serves them at `/images/...` and `/pdfs/...`.
Content that existed in the website's code but was never shown is archived in
`seed/site-content/unrendered.json` for reference.

### Changing a page's structure

A page's sections and fields are fixed by its template in
`src/site-content/templates`; content managers only edit values, and a save
that departs from the template is refused. After changing a template, update
the snapshot to match (the `seed-content` test checks it), then regenerate the
website's types and fallback content:

```bash
bun run site:export ../../uni-cms/src/content
```

### Environment

- `CORS_ORIGINS` — every portal host and the public website, comma-separated.
  Unset in development allows `localhost` and `*.localhost`.
- `MEDIA_DIR` — where uploaded and seeded media is stored (default `/data/`).

The API checks permissions, not role names: see `src/iam/permissions.ts` for
what each role grants.

User management is split by domain (`USER_SCOPES` in the same file): the
grades admin (`admin`) manages data-entry users, the website admin
(`cms-admin`) manages content managers, and the system administrator
(`super-admin`) manages everyone. Each sees only the users and roles of their
own domain; a user's roles in other domains are left as they are. Nobody is a
super admin until one is named:

```bash
bun run grant-role <login> super-admin    # in Docker: docker compose exec backend bun run grant-role ...
``` The portals (`staff`, `grades`, `cms`, `management`,
`teachers`, `students`, `lms`) each admit only holders of their domain; `staff`
admits any staff member. Sessions are shared across portals when every portal
calls the API on one host of the same site (e.g. `api.<domain>`). Note that
browsers treat `*.localhost` subdomains as separate sites, so to try
cross-portal sessions locally use a name like `*.lvh.me`, which resolves to
127.0.0.1.
