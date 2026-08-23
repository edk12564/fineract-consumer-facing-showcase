var e=`
<h2 id="_development">Development</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This chapter covers the day-to-day developer workflow for the Angular client. It describes the npm script inventory, running the dev server against the backend stack, unit and end-to-end tests, regenerating the typed API client, and how the built app is served through nginx in the local Docker stack.</p>
</div>
<div class="sect2">
<h3 id="_build_and_test">Build and Test</h3>
<div class="paragraph">
<p>This section describes the developer workflow for the Angular client. All commands run from <code>frontend/</code>. Prerequisites (Node 22, Docker, the development JWT signing key) and the backend stack itself are covered in <code>docs/consumer/development/build-and-test.adoc</code>; this section only repeats what is frontend-specific.</p>
</div>
<div class="sect3">
<h4 id="_npm_script_inventory">npm script inventory</h4>
<div class="paragraph">
<p>Every script in <code>frontend/package.json</code>:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Script</th>
<th class="tableblock halign-left valign-top">What it does</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>start</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ng serve</code>: the Angular dev server on port 4200, proxying <code>/api</code> to the BFF (see below).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>build</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ng build</code>: a production build into <code>dist/frontend/browser</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>watch</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ng build --watch --configuration development</code>: rebuilds on file change without serving.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>test</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ng test</code>: Vitest unit tests through the Angular CLI.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>lint</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ng lint</code>: ESLint over <code>src/*/*.ts</code> and <code>src/*/*.html</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>format</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Prettier, rewriting files under <code>src/</code> in place.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>format:check</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Prettier in check-only mode; fails if any file would change.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>i18n:check</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>node scripts/check-i18n.mjs</code>: fails on hardcoded user-facing text (see below).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>generate:client</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Regenerates the TypeScript API client via the consumer Gradle build (see below).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>generate:jwt-key</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Runs <code>consumer/scripts/generate-dev-jwt-key.sh</code> to create the dev JWT signing key.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>playwright test</code>: runs the Playwright specs against an already-running stack.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:ui</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>playwright test --ui</code>: the same specs in Playwright&#8217;s interactive UI mode.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:docker:up:backend</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Generates the JWT key, then starts only the <code>bff</code> service (and its dependencies) from <code>docker-compose.e2e.yml</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:docker:up</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Backend up, regenerate the TypeScript client, then build and start the full stack including the frontend container.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:docker:down</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>docker compose down -v</code>: removes containers and volumes for a clean next start.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:docker:logs</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Follows the compose logs of the e2e stack.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:docker:ps</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Lists the e2e stack&#8217;s containers.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>e2e:stack:run</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">One shot: <code>e2e:docker:up</code>, then <code>e2e</code>, then <code>e2e:docker:down</code>.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_dev_server">Dev server</h4>
<div class="paragraph">
<p><code>npm start</code> runs <code>ng serve</code> on <a href="http://localhost:4200" class="bare">http://localhost:4200</a>. The serve target in <code>angular.json</code> points at <code>proxy.conf.json</code>, which forwards every <code>/api</code> request to <code><a href="http://localhost:8080" class="bare">http://localhost:8080</a></code>. The browser therefore talks only to the dev server, and the dev server relays API calls to the BFF. This mirrors the nginx setup used in Docker (see the Serving the Built App section) and avoids cross-origin requests.</p>
</div>
<div class="paragraph">
<p>The proxy only forwards; it does not start anything. The backend stack must already be up, or every API call returns a connection error. Start it as described in <code>docs/consumer/development/build-and-test.adoc</code>, or use <code>npm run e2e:docker:up:backend</code> from <code>frontend/</code>, which also generates the JWT key first.</p>
</div>
</div>
<div class="sect3">
<h4 id="_unit_tests">Unit tests</h4>
<div class="paragraph">
<p>Unit tests run on Vitest (a fast test runner from the Vite ecosystem) through the Angular CLI. The <code>test</code> target in <code>angular.json</code> uses the <code>@angular/build:unit-test</code> builder with <code>runner: vitest</code> and <code>vitest.config.ts</code>. That config file&#8217;s only job is forcing the Ionic/Stencil packages through Vite&#8217;s resolver.</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="bash"><span class="nb">cd </span>frontend
npm <span class="nb">test</span></code></pre>
</div>
</div>
<div class="paragraph">
<p>Specs are <code>.spec.ts</code> files colocated with their subjects under <code>frontend/src/app/</code>. They mainly cover the signal-backed feature stores (<code>savings.store.spec.ts</code>, <code>loans.store.spec.ts</code>, <code>transfers.store.spec.ts</code>, and so on), the HTTP interceptors (<code>error.interceptor.spec.ts</code>), and the form-heavy components (registration, login, transfer form, loan application, change password).</p>
</div>
</div>
<div class="sect3">
<h4 id="_end_to_end_tests_playwright">End-to-end tests (Playwright)</h4>
<div class="paragraph">
<p>Playwright (a browser automation framework) drives a real Chromium browser against the dockerized, nginx-served app. <code>playwright.config.ts</code> sets:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>baseURL</code> <code><a href="http://localhost:4443" class="bare">http://localhost:4443</a></code>, overridable with the <code>PLAYWRIGHT_BASE_URL</code> environment variable</p>
</li>
<li>
<p>a single worker with <code>fullyParallel: false</code>, so specs run one at a time</p>
</li>
<li>
<p>retries 2 and a 180-second per-test timeout in CI; 0 retries and 30 seconds locally</p>
</li>
<li>
<p>trace, screenshot, and video captured only for failures</p>
</li>
<li>
<p>one project: Desktop Chrome</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The specs live in <code>frontend/playwright/tests/</code>:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Spec</th>
<th class="tableblock halign-left valign-top">Covers</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>registration.spec.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The registration walk from identity form to OTP to success, asserting the OTP and document key never land in browser storage.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loans.spec.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Guarded-route redirect, the payment button hidden on inactive loans, the repay OTP step-up happy path, and the wrong-OTP error snackbar.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>transfers.spec.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Guarded-route redirect, history-to-form navigation, the transfer OTP step-up happy path, and the wrong-OTP error snackbar.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>savings.spec.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Guarded-route redirect to <code>/login</code> when unauthenticated.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>summary.spec.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Guarded-route redirect to <code>/login</code> when unauthenticated.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The specs stub every BFF response in the browser with Playwright&#8217;s <code>page.route</code>, so they exercise the served app and its routing, forms, and interceptors without depending on backend data. They therefore do not require <code>consumer/scripts/seed-demo.sh</code>: seeding is for the interactive demo, described in <code>docs/consumer/development/demo.adoc</code>.</p>
</div>
<div class="paragraph">
<p>The stack comes from <code>docker-compose.e2e.yml</code> at the repository root. That compose file pulls in the whole backend stack via <code>include: consumer/compose.yaml</code> and adds one <code>frontend</code> service: the nginx image that serves the built app on host port 4443. The usual way to run everything is the one-shot script, which brings the stack up (including client regeneration), runs the specs, and tears down with <code>-v</code>:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="bash"><span class="nb">cd </span>frontend
npm run e2e:stack:run</code></pre>
</div>
</div>
<div class="paragraph">
<p>To iterate on specs, run <code>npm run e2e:docker:up</code> once and then <code>npm run e2e</code> (or <code>npm run e2e:ui</code>) repeatedly, tearing down with <code>npm run e2e:docker:down</code> when finished.</p>
</div>
</div>
<div class="sect3">
<h4 id="_regenerating_the_typescript_client">Regenerating the TypeScript client</h4>
<div class="paragraph">
<p><code>npm run generate:client</code> changes into <code>consumer/</code> and runs the <code>generateTypescriptClient</code> Gradle task, which scrapes the OpenAPI spec from the running BFF and writes the typed Angular client to <code>frontend/src/openapi-client</code> (imported as <code>@bff/client</code>). Two rules carry over from the backend pipeline (full details in <code>docs/consumer/development/build-and-test.adoc</code>):</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The backend stack must be up, because the spec is read from the running application.</p>
</li>
<li>
<p>Delete the old output first: the generator does not remove files for endpoints that no longer exist, so stale services linger otherwise. The directory is gitignored generated output.</p>
</li>
</ul>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="bash"><span class="nb">cd </span>frontend
<span class="nb">rm</span> <span class="nt">-rf</span> src/openapi-client
npm run generate:client</code></pre>
</div>
</div>
</div>
<div class="sect3">
<h4 id="_lint_format_and_i18n_check">Lint, format, and i18n check</h4>
<div class="paragraph">
<p><code>npm run lint</code> runs angular-eslint over all TypeScript and templates under <code>src/</code>. <code>npm run format</code> and <code>npm run format:check</code> apply Prettier with the settings embedded in <code>package.json</code> (100-character lines, single quotes, the Angular parser for HTML). <code>npm run i18n:check</code> parses every component template under <code>src/app</code> and fails the build if it finds hardcoded user-facing text, meaning literal text nodes or attributes such as <code>title</code>, <code>placeholder</code>, and <code>aria-label</code>. All copy must therefore resolve through the translation pipe or be added to the script&#8217;s allowlist. CI runs <code>lint</code> and <code>format:check</code> in the <code>prettier-eslint.yaml</code> workflow and <code>i18n:check</code> in the <code>i18n-check.yml</code> workflow (see the continuous-integration section of <code>docs/consumer/development/build-and-test.adoc</code>).</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="serving">Serving the Built App</h3>
<div class="paragraph">
<p>This section describes how the Angular app is packaged and served in the local Docker stack. A multi-stage image builds the app with Node and serves the static files with nginx. Nothing else sits in front of it. nginx is both the web server and the reverse proxy to the BFF.</p>
</div>
<div class="sect3">
<h4 id="_the_docker_image">The Docker image</h4>
<div class="paragraph">
<p><code>frontend/Dockerfile</code> is a multi-stage build (a Dockerfile with separate build and runtime stages, so build tooling never ships in the final image):</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><strong>Build stage</strong> (<code>node:22-alpine</code>). This stage copies <code>package.json</code> and <code>package-lock.json</code>, runs <code>npm ci</code> (a clean, lockfile-exact install), copies the sources, and runs <code>npm run build&#8201;&#8212;&#8201;--configuration production</code>.</p>
</li>
<li>
<p><strong>Serve stage</strong> (<code>nginx:1.27-alpine</code>). This stage copies <code>frontend/nginx.conf</code> to <code>/etc/nginx/conf.d/default.conf</code> and the built app from <code>dist/frontend/browser</code> into <code>/usr/share/nginx/html</code>. The container exposes port 80.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>The final image contains only nginx and the static build output, with no Node and no sources.</p>
</div>
</div>
<div class="sect3">
<h4 id="_the_nginx_configuration">The nginx configuration</h4>
<div class="paragraph">
<p><code>frontend/nginx.conf</code> defines a single server on port 80 with three concerns:</p>
</div>
<div class="paragraph">
<p><strong>SPA fallback.</strong> The catch-all <code>location /</code> serves files from <code>/usr/share/nginx/html</code> with <code>try_files $uri $uri/ /index.html</code>. If the requested path is a real file (a JS bundle, an image), it is served directly. Anything else, such as an Angular route like <code>/loans/1</code>, falls back to <code>index.html</code> so the client-side router can take over. Without this, refreshing the browser on a deep link would return a 404.</p>
</div>
<div class="paragraph">
<p><strong>API proxy.</strong> <code>location /api/</code> forwards to <code><a href="http://bff:8080/api/" class="bare">http://bff:8080/api/</a></code> over HTTP/1.1 (<code>bff</code> is the BFF&#8217;s hostname on the Docker network). It sets the usual forwarded headers so the BFF sees the original caller: <code>Host</code>, <code>X-Real-IP</code>, <code>X-Forwarded-For</code>, <code>X-Forwarded-Host</code>, and <code>X-Forwarded-Proto</code> (hardcoded to <code>http</code>, matching the plain-HTTP dev stack). Because app and API share one origin, the browser never makes cross-origin requests and the BFF&#8217;s cookies (the refresh token) work without CORS configuration.</p>
</div>
<div class="paragraph">
<p><strong>Security headers.</strong> Four <code>add_header &#8230;&#8203; always</code> directives are attached to every response:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Header</th>
<th class="tableblock halign-left valign-top">Value</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>X-Frame-Options</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SAMEORIGIN</code>. The app may not be embedded in frames on other sites (clickjacking protection).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>X-Content-Type-Options</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>nosniff</code>. The browser must not second-guess declared content types.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>Referrer-Policy</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>strict-origin-when-cross-origin</code>. Cross-origin requests leak only the origin, not full URLs.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>Permissions-Policy</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>camera=(), microphone=(), geolocation=()</code>. Those browser features are disabled outright.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>That is the whole file: there is no gzip or other compression configuration, no caching directives, and no TLS block.</p>
</div>
</div>
<div class="sect3">
<h4 id="_compose_topology">Compose topology</h4>
<div class="paragraph">
<p>The frontend container is not part of the backend stack in <code>consumer/compose.yaml</code>. It is added by <code>docker-compose.e2e.yml</code> at the repository root, which includes the backend stack via compose&#8217;s <code>include:</code> mechanism and defines one extra service, <code>frontend</code>. That service is built from <code>frontend/Dockerfile</code> and starts only after the <code>bff</code> service reports healthy, with container port 80 mapped to host port 4443 and a 128 MB memory limit. A wget-based healthcheck polls the root page until nginx responds.</p>
</div>
<div class="paragraph">
<p>The resulting local topology is simple: the browser talks to nginx on <code><a href="http://localhost:4443" class="bare">http://localhost:4443</a></code>, and nginx either serves the static files or proxies <code>/api/</code> requests to <code>bff:8080</code> on the Docker network.</p>
</div>
</div>
<div class="sect3">
<h4 id="_transport_security">Transport security</h4>
<div class="paragraph">
<p>The dev/demo stack serves plain HTTP end to end: nginx listens on port 80, mapped to host port 4443 (a port number that suggests HTTPS but is not), and proxies to the BFF over the Docker network, with <code>X-Forwarded-Proto</code> fixed to <code>http</code>. Production deployments run behind the provider&#8217;s edge, which terminates TLS and sets <code>X-Forwarded-Proto</code> accordingly. This is local-development-only serving: the stack exists to run the end-to-end tests and local demos on localhost, and must not be exposed beyond it. This posture, together with the rest of the dev-only setup (generated signing key on disk, Mailpit as the mail catcher), is described in <code>docs/consumer/development/demo.adoc</code>.</p>
</div>
</div>
</div>
</div>
`;export{e as default};