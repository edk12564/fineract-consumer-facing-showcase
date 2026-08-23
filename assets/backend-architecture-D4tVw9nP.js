var e=`
<h2 id="_architecture">Architecture</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This chapter describes the overall structure of the BFF. It explains why the service exists, how the codebase is divided into modules, what the shared infrastructure provides, how state is persisted, and how the service integrates with Fineract Core. Read the overview and module structure sections first; they explain the boundaries that every other section assumes.</p>
</div>
<div class="sect2">
<h3 id="_architecture_overview">Architecture Overview</h3>
<div class="sect3">
<h4 id="_what_this_project_is">What this project is</h4>
<div class="paragraph">
<p>This repository contains a consumer-facing banking application built on top of Apache Fineract Core. It has two deliverables:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>A backend-for-frontend (BFF): a Spring Boot service in <code>consumer/</code>. A BFF is a server that sits between a specific client application and the systems of record, exposing exactly the API that client needs and nothing more.</p>
</li>
<li>
<p>A demo Angular client in <code>frontend/</code> that exercises the BFF endpoints end to end.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The BFF is the only component allowed to talk to upstream Fineract Core. The Angular client talks only to the BFF. This boundary is the reason the project exists and is not negotiable.</p>
</div>
</div>
<div class="sect3">
<h4 id="_why_the_bff_exists">Why the BFF exists</h4>
<div class="paragraph">
<p>Fineract previously shipped Self-Service APIs that allowed consumer clients to call Fineract directly. Those APIs were deprecated and removed in 2025 because direct client-to-Fineract access was insecure: Fineract&#8217;s authorization model is built for back-office staff, not for anonymous consumers on the public internet.</p>
</div>
<div class="paragraph">
<p>The BFF replaces that model. It is the policy enforcement point for consumer-facing rules:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>It owns consumer identity: registration, OTP verification, login, JWT issuance, refresh-token rotation, and device-fingerprint binding.</p>
</li>
<li>
<p>It enforces attribute-based access control (ABAC) on every request before anything reaches Fineract. Fineract only ever sees a trusted service account, so the BFF&#8217;s checks are the consumer-level authorization, not a duplicate of Fineract&#8217;s.</p>
</li>
<li>
<p>It translates between consumer-shaped DTOs and Fineract&#8217;s internal API shapes, so Fineract response formats never leak to the browser.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_repository_layout">Repository layout</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Contents</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>consumer/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The Spring Boot BFF (Java 21, Gradle). Source under <code>src/main/java/org/apache/fineract/consumer</code>, Liquibase changelogs under <code>src/main/resources/db/changelog/</code>, Cucumber features under <code>src/test/resources/features/</code>, the local Docker stack in <code>compose.yaml</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>frontend/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The Angular demo client (TypeScript). Built into a static bundle and served by nginx (see <code>frontend/Dockerfile</code> and <code>frontend/nginx.conf</code>). Consumes the generated <code>@bff/client</code> OpenAPI client in <code>frontend/src/openapi-client/</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>.github/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">CI workflows: backend and frontend build-and-test, CodeQL, Apache RAT license checks, ASF allowlist checks, Category X dependency checks, frontend Prettier and ESLint checks, i18n checks, PR test-count checks, zizmor workflow linting.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>docs/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Project documentation, including this manual.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Within the BFF, code is packaged by feature (bounded context), not by layer: <code>audit</code>, <code>authentication</code>, <code>beneficiaries</code>, <code>identity</code>, <code>loans</code>, <code>openbanking</code>, <code>registration</code>, <code>savings</code>, <code>summary</code>, <code>transfers</code>, <code>user</code>, plus a shared <code>infrastructure</code> package (which also hosts cross-feature capabilities such as OTP challenges). Spring Modulith (a library that treats each top-level package as a module and verifies that modules only use each other&#8217;s exposed interfaces) enforces these boundaries at test time. Each feature is split into <code>command</code> (writes) and <code>query</code> (reads) sub-trees.</p>
</div>
</div>
<div class="sect3">
<h4 id="_runtime_topology">Runtime topology</h4>
<div class="imageblock">
<div class="content">
<img src="/diagrams/diag-2af8d42c4a6d8ad87e7bf91f2a209d3a.svg" alt="Diagram" width="1989" height="559">
</div>
<div class="title">Figure 1. Local stack: containers, ports, and who talks to whom</div>
</div>
<div class="paragraph">
<p>The local stack is defined in <code>consumer/compose.yaml</code>. Docker Compose (a tool that starts a set of containers with one command) brings up:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Service</th>
<th class="tableblock halign-left valign-top">Image</th>
<th class="tableblock halign-left valign-top">Role</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>bff</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">built from <code>consumer/Dockerfile</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The BFF itself, host port 8080.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>bff-db</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>postgres:18-alpine</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The BFF&#8217;s own PostgreSQL database, host port 5432. Holds users, refresh tokens, beneficiaries, audit events, open banking consents, registered third-party providers (TPPs), OAuth2 authorization state, and the Modulith event publication log.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>fineract</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>apache/fineract:1.12.1</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Upstream Fineract Core, host port 8888 (container port 8080), SSL disabled inside the compose network.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>fineract-db</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>postgres:18-alpine</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fineract&#8217;s tenant database, host port 5433.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>valkey</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>valkey/valkey:8-alpine</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Valkey, a Redis-compatible in-memory store, host port 6379. Used by the BFF for the JWT denylist, pending OTP hashes, rate-limit counters, and the ownership cache.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>mailpit</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>axllent/mailpit:v1.30.2</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Development SMTP catcher. OTP emails land in a web inbox on host port 8025; SMTP on host port 1025.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The full end-to-end stack in <code>docker-compose.e2e.yml</code> at the repository root reuses <code>consumer/compose.yaml</code> via Compose&#8217;s <code>include:</code> directive and adds one service:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>frontend</code>: the Angular bundle served by nginx on host port 4443. Its <code>nginx.conf</code> proxies <code>/api/</code> to <code><a href="http://bff:8080/api/" class="bare">http://bff:8080/api/</a></code> and serves the static app for everything else.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Database containers use <code>tmpfs</code> volumes, so all data is wiped whenever the stack stops. This is deliberate: every test run starts from a clean database.</p>
</div>
</div>
<div class="sect3">
<h4 id="_request_path">Request path</h4>
<div class="paragraph">
<p>A browser request travels through the following hops in the e2e stack:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>Browser calls <code><a href="http://localhost:4443" class="bare">http://localhost:4443</a></code>. nginx in the <code>frontend</code> container serves the Angular app and adds security response headers.</p>
</li>
<li>
<p>The Angular app calls <code>/api/&#8230;&#8203;</code>. nginx proxies these to <code>bff:8080</code>, adding <code>X-Forwarded-*</code> headers, which the BFF honors via <code>server.forward-headers-strategy=framework</code>.</p>
</li>
<li>
<p>The BFF authenticates the JWT, checks the <code>X-Device-Fingerprint</code> header against the token&#8217;s claim, evaluates ABAC policy, and reads or writes its own PostgreSQL and Valkey state as needed.</p>
</li>
<li>
<p>If Fineract data is required, the BFF calls <code><a href="http://fineract:8080/fineract-provider/api" class="bare">http://fineract:8080/fineract-provider/api</a></code> over the Docker network through its generated Feign client, authenticating with a Fineract service account and the <code>Fineract-Platform-TenantId</code> header.</p>
</li>
<li>
<p>The response is mapped from Fineract&#8217;s shapes into the BFF&#8217;s own DTOs before returning to the browser.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>When running the backend stack alone (Cucumber tests, manual curl), clients hit the BFF directly on <code><a href="http://localhost:8080" class="bare">http://localhost:8080</a></code> and the nginx hop is absent.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>A single choke point between consumers and Fineract means every consumer-facing rule (KYC standing, account ownership, device trust, rate limits, consent scope) is enforced in one codebase instead of being scattered across clients or bolted onto Fineract.</p>
</li>
<li>
<p>Fineract sees only a service account. This keeps upstream Fineract unmodified and lets the BFF&#8217;s authorization model evolve independently of back-office roles.</p>
</li>
<li>
<p>Package-by-feature with Spring Modulith keeps a multi-year codebase navigable: a feature&#8217;s controllers, services, entities, and migrations live together, and the module test fails when a boundary is crossed.</p>
</li>
<li>
<p>Docker Compose with ephemeral databases makes local development and CI identical: every run starts from the same clean state, and there is no drift between "works on my machine" environments.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>The compose stack is a development and demo runtime.</strong> Production deployments bring their own orchestration (Kubernetes, ECS) and high-availability setup.</p>
</li>
<li>
<p><strong>All in-network traffic is cleartext HTTP.</strong> This includes BFF to Fineract, and TLS termination exists only conceptually (the nginx layer runs plain HTTP on port 4443). Production requires TLS on every wire; mutual TLS is reserved for connections between open banking providers and the open banking endpoints.</p>
</li>
<li>
<p><strong>No correlation ID reaches Fineract calls.</strong> A correlation ID is stored on audit events (<code>correlation_id</code> column in the <code>audit</code> changelog entity), but there is no Feign interceptor that forwards a request ID, so tracing a request across BFF and Fineract logs is manual.</p>
</li>
<li>
<p><strong>Actuator endpoints share the application port.</strong> Production deployments move them to a separate management port.</p>
</li>
<li>
<p><strong>Logging uses Spring Boot defaults.</strong> Production deployments enable structured JSON logging.</p>
</li>
<li>
<p><strong>The <code>tmpfs</code> databases are wiped on every restart.</strong> This suits local development and tests; a deployment that needs data to survive restarts replaces them with persistent volumes.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_module_structure">Module Structure</h3>
<div class="paragraph">
<p>This section explains how the BFF codebase under <code>consumer/src/main/java/org/apache/fineract/consumer</code> is divided into modules, how those boundaries are enforced, and how code is laid out inside each module.</p>
</div>
<div class="sect3">
<h4 id="_spring_modulith">Spring Modulith</h4>
<div class="paragraph">
<p>Spring Modulith is a library that enforces module boundaries inside a single Spring Boot application. The application still builds and deploys as one artifact, but Modulith treats designated packages as modules and verifies at test time that no module reaches into another module&#8217;s private internals. It gives most of the discipline of separate services without the operational cost of running them.</p>
</div>
<div class="sect4">
<h5 id="_how_modules_are_detected">How modules are detected</h5>
<div class="paragraph">
<p>Every direct sub-package of <code>org.apache.fineract.consumer</code> is a module. This is configured centrally rather than per package:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>ConsumerModuleDetectionStrategy</code> (in the root package) implements Modulith&#8217;s <code>ApplicationModuleDetectionStrategy</code>. Its <code>getModuleBasePackages</code> method delegates to the built-in <code>directSubPackage()</code> strategy, so each top-level package such as <code>loans</code> or <code>registration</code> becomes one module.</p>
</li>
<li>
<p>The strategy is registered in <code>src/main/resources/application.properties</code> via <code>spring.modulith.detection-strategy=org.apache.fineract.consumer.ConsumerModuleDetectionStrategy</code>.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>There are no <code>package-info.java</code> files and no <code>@ApplicationModule</code> or <code>@NamedInterface</code> annotations anywhere in the source tree. All boundary configuration lives in the one strategy class. Do not add per-package annotations; they would duplicate the central configuration.</p>
</div>
</div>
<div class="sect4">
<h5 id="_what_each_module_exposes">What each module exposes</h5>
<div class="paragraph">
<p>A module&#8217;s "named interfaces" are the sub-packages other modules are allowed to import from. <code>ConsumerModuleDetectionStrategy.detectNamedInterfaces</code> defines them:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The <code>infrastructure</code> module is fully open (<code>NamedInterfaces.forOpen</code>). Any feature module may import any of its classes.</p>
</li>
<li>
<p>Every other module exposes only the sub-packages matching <code>command.data</code>, <code>command.service</code>, <code>query.data</code>, and <code>query.service</code>.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>In practice this means a feature&#8217;s service interfaces and its data-transfer classes are public to other modules, while <code>api/</code> (controllers), <code>domain/</code> (JPA entities), <code>repository/</code>, and <code>exception/</code> packages are module private. For example, <code>registration</code> may call <code>identity.query.service.IdentityQueryService</code> and receive types from <code>identity.query.data</code>, but it cannot touch an identity repository or entity.</p>
</div>
</div>
<div class="sect4">
<h5 id="_verification">Verification</h5>
<div class="paragraph">
<p><code>ModulithArchitectureTest</code> in <code>src/test/java/org/apache/fineract/consumer/</code> runs <code>ApplicationModules.of(ConsumerApplication.class).verify()</code> as a JUnit test. The build fails if any class imports another module&#8217;s non-exposed package or if two modules form a dependency cycle. This test is the enforcement mechanism; the boundaries are not checked at runtime.</p>
</div>
</div>
</div>
<div class="sect3">
<h4 id="_module_list">Module list</h4>
<div class="paragraph">
<p>The codebase has twelve top-level modules. Eleven are feature modules; <code>infrastructure</code> is shared plumbing (covered in the Infrastructure section).</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Module</th>
<th class="tableblock halign-left valign-top">Sides present</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>audit</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command, query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Receives batched client-side audit events at <code>POST /api/v1/audit/events</code>, screens them for PII (<code>AuditPiiScreen</code>), persists server-published audit events (<code>ServerAuditEventListener</code>), and prunes old rows (<code>AuditRetentionJob</code>). The query side serves <code>GET /api/v1/audit/events</code>, a demo-only paginated list of the caller&#8217;s own audit activity.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>authentication</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Login, OTP second factor, refresh-token rotation, and logout under <code>/api/v1/authentication</code> (<code>/login</code>, <code>/2fa</code>, <code>/refresh</code>, <code>/logout</code>).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>beneficiaries</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command, query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Manage transfer beneficiaries: list, add, modify, delete; the add and modify writes are guarded by an initiate/confirm step-up ceremony.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>identity</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Supporting module with no controllers. <code>IdentityQueryService</code> compares a user-supplied government ID against the identifiers Fineract already holds for a client (account binding). Consumed by <code>registration</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>infrastructure</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">not CQRS-split</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Shared cross-cutting code: security configuration, ABAC evaluation, the Fineract client, JWT issuing, OTP issuance and verification, exception handling, and more. Fully open to all modules.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loans</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command, query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan accounts: list, detail, repayment schedule preview, transactions, charges, guarantors, application template (query); submit, modify, and withdraw loan applications (command).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>openbanking</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command, query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Third-party (TPP) facing account-access consents and read-only accounts and balances, plus the logged-in user&#8217;s view of granted consents and consent revocation.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>registration</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Consumer sign-up under <code>/api/v1/registration</code>: submit identity details, send OTP, verify OTP, then bind to an existing Fineract client.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>savings</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Savings accounts: list, detail, charges, transactions, transaction detail, application template. Read only.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>summary</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>GET /api/v1/summary/accounts</code>: an aggregated view of the logged-in client&#8217;s savings and loan accounts from a single Fineract call.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>transfers</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command, query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Money movement with an initiate/confirm step-up ceremony under <code>/api/v1/transfers</code> (command); paginated transfer history at <code>GET /api/v1/transfers</code> (query).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>user</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">command, query</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Password change, forgot, and reset flows (command); profile, charges, client image, and obligees views (query).</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Modules only create the sides they need. A read-only feature such as <code>savings</code> has no <code>command/</code> tree, and <code>identity</code> has no controllers at all. Empty sides are never pre-created.</p>
</div>
</div>
<div class="sect3">
<h4 id="_cqrs_package_layout">CQRS package layout</h4>
<div class="paragraph">
<p>CQRS (Command Query Responsibility Segregation) means writes (commands) and reads (queries) are modeled as separate code paths. In this codebase the separation is total: every layer exists twice, once per side, and the two sides do not import from each other even inside the same module. A cross-side import fails the build through <code>CqrsArchitectureTest</code> (see below).</p>
</div>
<div class="sect4">
<h5 id="_concrete_directory_shape">Concrete directory shape</h5>
<div class="paragraph">
<p>Inspecting <code>beneficiaries</code>, <code>openbanking</code>, and <code>user</code> shows the full shape. A side omits directories it does not need (for example <code>loans</code> and <code>savings</code> keep no local state, so they have no <code>domain/</code> or <code>repository/</code>):</p>
</div>
<div class="listingblock">
<div class="content">
<pre>consumer.&lt;feature&gt;.
├── command.
│   ├── api/         # &lt;Feature&gt;CommandController
│   ├── data/        # *Command, *CommandRequest, *CommandData, contract enums
│   ├── domain/      # mutable JPA entities, value objects (only when the feature has local state)
│   ├── exception/   # command-side exceptions extending AbstractConsumerException
│   ├── repository/  # &lt;Feature&gt;CommandRepository (only when actually used)
│   └── service/     # &lt;Feature&gt;CommandService interface + &lt;Feature&gt;CommandServiceImpl
└── query.
    ├── api/         # &lt;Feature&gt;QueryController
    ├── data/        # *Query inputs, *QueryData read models, contract enums
    ├── domain/      # read-only JPA entities (only when the feature has local state)
    ├── exception/   # query-side exceptions
    ├── repository/  # &lt;Feature&gt;QueryRepository (only when actually used)
    └── service/     # &lt;Feature&gt;QueryService interface + &lt;Feature&gt;QueryServiceImpl</pre>
</div>
</div>
</div>
<div class="sect4">
<h5 id="_per_side_duplication_is_deliberate">Per-side duplication is deliberate</h5>
<div class="paragraph">
<p>Each side owns its types end to end, even when both sides touch the same database table:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The command side owns the mutable JPA entity, for example <code>user.command.domain.User</code> mapped to the <code>users</code> table.</p>
</li>
<li>
<p>The query side maps the same table with its own read-only twin: <code>user.query.domain.UserQueryEntity</code> carries <code>@Entity(name = "UserQueryEntity")</code>, <code>@Table(name = "users")</code>, and Hibernate&#8217;s <code>@Immutable</code>. The distinct entity name prevents a collision with the command entity, and <code>@Immutable</code> makes accidental writes impossible. <code>beneficiaries</code> and <code>openbanking</code> follow the same pattern (<code>BeneficiaryQueryEntity</code>, <code>OpenBankingConsentQueryEntity</code>).</p>
</li>
<li>
<p>Enums referenced by exposed DTOs are copied per side: <code>UserStatus</code> exists in both <code>user.command.data</code> and <code>user.query.data</code>. Even helper classes are duplicated where both sides need them, such as <code>OpenBankingPermissionSetConverter</code> in both <code>openbanking.command.domain</code> and <code>openbanking.query.domain</code>.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The persistence model is single-store CQRS: one PostgreSQL database, one Liquibase schema, two entity mappings. There is no separate read store and no event sourcing.</p>
</div>
</div>
<div class="sect4">
<h5 id="_what_modulith_does_and_does_not_enforce_here">What Modulith does and does not enforce here</h5>
<div class="paragraph">
<p>Modulith enforces the boundary <strong>between</strong> modules. It does not police sub-packages <strong>inside</strong> a module, so <code>ModulithArchitectureTest</code> alone would not stop <code>loans.command</code> from importing <code>loans.query</code>. That gap is covered by a second test: <code>CqrsArchitectureTest</code> (also in <code>src/test/java/org/apache/fineract/consumer/</code>) uses ArchUnit, a library for writing architecture rules as tests, to discover every feature&#8217;s <code>command</code> and <code>query</code> packages and fail the build on any dependency between the two sides of the same feature.</p>
</div>
</div>
</div>
<div class="sect3">
<h4 id="_request_flow_through_a_module">Request flow through a module</h4>
<div class="paragraph">
<p>A request passes through a fixed set of layers. Using a savings read as the example:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><strong>Controller</strong> (<code>savings.query.api.SavingsQueryController</code>). Controllers are dispatchers: they translate HTTP into a query or command input object, call the side-appropriate service interface, and return the result. No business logic.</p>
</li>
<li>
<p><strong>Service</strong> (<code>SavingsQueryService</code> interface, <code>SavingsQueryServiceImpl</code>). Controllers depend on the interface, never the implementation. The implementation first authorizes the caller through the shared ABAC evaluator (<code>infrastructure.access.service.AccessPolicyEvaluator</code>), passing a <code>ConsumerAction</code> such as <code>SAVINGS_VIEW</code> and the resource id.</p>
</li>
<li>
<p><strong>Data access</strong>. Depending on the feature this is one or both of:</p>
<div class="ulist">
<ul>
<li>
<p>a Spring Data repository over the BFF&#8217;s own PostgreSQL tables (for features with local state such as <code>user</code>, <code>beneficiaries</code>, <code>openbanking</code>, <code>audit</code>), or</p>
</li>
<li>
<p>the generated Fineract client. Services call typed API classes such as <code>SavingsAccountApi</code> from <code>infrastructure.fineractclient.generated.api</code>, wrapping each call in <code>FineractCaller.call(&#8230;&#8203;)</code> to translate upstream Feign errors into the feature&#8217;s own exceptions.</p>
</li>
</ul>
</div>
</li>
<li>
<p><strong>Mapping</strong>. The service maps Fineract&#8217;s generated response models or JPA entities into the feature&#8217;s own <code>*QueryData</code> or <code>*CommandData</code> classes in <code>data/</code>. Fineract response shapes never leave the service layer.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>Errors thrown anywhere along the path extend <code>AbstractConsumerException</code> and are translated to a uniform JSON error body by the shared handler in <code>infrastructure.exception</code> (see the Infrastructure section).</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_2">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p><strong>Module boundaries keep a multi-year codebase maintainable.</strong> The BFF is expected to grow feature by feature over years. Modulith makes "which code may depend on which" an executable rule instead of tribal knowledge, and the verification test catches boundary erosion the moment it happens rather than in a painful later refactor.</p>
</li>
<li>
<p><strong>One deployable, service-like discipline.</strong> Splitting into microservices now would add network hops, distributed transactions, and operational overhead with no current payoff. Modulith gives the isolation benefits while everything remains one Spring Boot process.</p>
</li>
<li>
<p><strong>CQRS separation lets read and write models evolve independently.</strong> Read endpoints shape data for screens; write endpoints enforce invariants. Keeping them apart means a new read model never risks a write path, and the read-only <code>@Immutable</code> entities make the query side provably side-effect free.</p>
</li>
<li>
<p><strong>Exposing only <code>data</code> and <code>service</code> keeps coupling narrow.</strong> Other modules can call a feature&#8217;s capability but can never bind to its controllers, entities, or repositories, so a feature can restructure its internals freely.</p>
</li>
<li>
<p><strong>Central detection strategy over per-package annotations.</strong> One class defines the whole boundary model, so a new module gets correct boundaries automatically by following the package convention.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_the_infrastructure_module">The Infrastructure Module</h3>
<div class="paragraph">
<p>The <code>consumer.infrastructure</code> package holds code shared by every feature module: security configuration, access control, the Fineract client, JWT plumbing, exception handling, and similar cross-cutting concerns. Under the Spring Modulith rules described in the Module Structure section, <code>infrastructure</code> is the one module declared fully open, so feature modules may import any class in it.</p>
</div>
<div class="sect3">
<h4 id="_the_dependency_rule">The dependency rule</h4>
<div class="paragraph">
<p>Features depend on infrastructure; infrastructure never depends on features. Every feature module imports infrastructure classes freely (the ABAC evaluator, the generated Fineract client, header constants). Infrastructure contains no import of a feature class.</p>
</div>
<div class="paragraph">
<p>When infrastructure needs data that a feature owns, it defines a port interface (an interface owned by the caller that someone else implements) and the feature supplies the implementation:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>infrastructure.access.repository.PrincipalUserLookupPort</code> is implemented by <code>user.query.service.PrincipalUserLookupAdapter</code>.</p>
</li>
<li>
<p><code>infrastructure.oauth2.service.OAuth2ConsentLookupPort</code> and <code>OAuth2ConsentRecorderPort</code> are implemented by <code>openbanking.query.service.OpenBankingConsentLookupAdapter</code> and <code>openbanking.command.service.OpenBankingConsentRecorderAdapter</code>.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Spring wires the adapter into the port at startup, so the compile-time dependency arrow still points from feature to infrastructure.</p>
</div>
<div class="paragraph">
<p>Modulith enforces this indirectly rather than by an explicit "no reverse dependency" rule. Because every feature already depends on <code>infrastructure</code>, any infrastructure import of a feature class would create a module cycle, and <code>ModulithArchitectureTest</code> rejects cycles. The port pattern is what keeps such imports unnecessary in the first place.</p>
</div>
<div class="paragraph">
<p>The sections below walk through each sub-package. Sub-packages follow a small internal convention: <code>data/</code> for value objects and constants, <code>service/</code> for behavior, plus <code>filter/</code>, <code>repository/</code>, <code>domain/</code>, <code>exception/</code>, <code>annotation/</code>, <code>configs/</code>, or <code>interceptors/</code> where applicable.</p>
</div>
</div>
<div class="sect3">
<h4 id="_access">access</h4>
<div class="paragraph">
<p>Request-time access control. ABAC (attribute-based access control) means authorization decisions are computed from attributes of the caller, the resource, and the request, rather than from role names alone. A dedicated security chapter covers the model in depth; this is the map of the code.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>data/</code> holds the policy model as data: <code>ConsumerAction</code> (an enum of every protected action, for example <code>SAVINGS_VIEW</code>, <code>TRANSFER_EXECUTE</code>), <code>ActionPolicy</code> (allowed scopes, whether verified KYC is required, and which <code>ResourceType</code> ownership check applies), and the <code>ActionPolicies</code> lookup table. It also holds <code>PrincipalUserData</code>, <code>OwnedAccounts</code>, <code>RateLimitWindow</code>, <code>AuthCookiePayload</code>, and <code>AuthenticationConstants</code>.</p>
</li>
<li>
<p><code>service/AccessPolicyEvaluator</code> is the enforcement point every feature service calls before doing work. <code>authorize(jwt, action, resourceId, onDenied)</code> checks four things in order: a policy exists for the action, the JWT carries an allowed scope, the <code>kyc_verified</code> claim is true where required, and the caller owns the target resource. Each denial publishes an <code>ACCESS_DENIED</code> audit event and throws.</p>
</li>
<li>
<p><code>service/</code> also holds <code>UserClientResolver</code> (maps the JWT subject to the bound Fineract client id), <code>OwnedAccountsCache</code> (a two-level cache of which savings and loan accounts a client owns: in-process Caffeine as level 1, Valkey as level 2), <code>JwtDenylist</code> (Valkey-backed logout denylist), <code>RateLimitCounter</code> (Valkey-backed fixed-window counters), and <code>AuthCookieFactory</code>.</p>
</li>
<li>
<p><code>filter/</code> holds the servlet filters wired into the security chains: <code>DeviceFingerprintFilter</code> compares the <code>X-Device-Fingerprint</code> header against the fingerprint claim bound into the JWT and rejects with 400, 401, or 403 depending on the failure, publishing an audit event on mismatch. <code>RateLimitFilter</code> is built through named factories: <code>perUser</code> (bucketed by JWT subject, on the consumer chain) and <code>perTppClient</code> (bucketed by the third party&#8217;s client id, on the OAuth2 token endpoint).</p>
</li>
<li>
<p><code>repository/PrincipalUserLookupPort</code> is the port through which access code reads user records without depending on the <code>user</code> module.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Feature services inject <code>AccessPolicyEvaluator</code> and <code>UserClientResolver</code> directly; the filters are wired once in <code>configs</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_audit">audit</h4>
<div class="paragraph">
<p>The server-side audit event contract. This package defines how any code publishes an audit event; it is distinct from the top-level <code>audit</code> feature module, which persists the events and serves the frontend audit-batch endpoint.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>data/</code> defines the two event classes, <code>TransactionalAuditEvent</code> and <code>NonTransactionalAuditEvent</code> (event UUID, <code>AuditEventType</code>, user id, device fingerprint, a details map), plus the <code>AuditEventType</code> and <code>AuditSeverity</code> enums.</p>
</li>
<li>
<p><code>annotation/</code> defines the two listener annotations. <code>@TransactionalAuditListener</code> is meta-annotated with Modulith&#8217;s <code>@ApplicationModuleListener</code>, so the listener runs asynchronously after the publishing transaction commits; use it for events that must not be recorded if the surrounding write rolls back. <code>@NonTransactionalAuditListener</code> combines <code>@Async</code> and <code>@EventListener</code> for immediate asynchronous delivery, used where there is no transaction, such as access denials.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Publishers anywhere in the codebase inject Spring&#8217;s <code>ApplicationEventPublisher</code> and publish an event object. The single consumer is <code>ServerAuditEventListener</code> in the <code>audit</code> feature module, which persists both event kinds and ignores duplicates by event UUID. Infrastructure defines the contract; the feature owns storage.</p>
</div>
</div>
<div class="sect3">
<h4 id="_configs">configs</h4>
<div class="paragraph">
<p>Cross-cutting Spring <code>@Configuration</code> classes. The important ones:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>SecurityConfig</code> builds the main consumer security filter chain. All endpoints require authentication except an explicit allow list (Swagger and OpenAPI paths, <code>/actuator/health</code>, <code>/api/v1/registration/**</code>, and the public POST paths for login, 2FA, refresh, and password forgot/reset). The access token is read from an httpOnly cookie rather than an <code>Authorization</code> header, through a custom bearer-token resolver. The chain adds <code>RateLimitFilter.perUser</code> and <code>DeviceFingerprintFilter</code>, runs stateless, and disables CSRF because the token is fingerprint-bound rather than ambient.</p>
</li>
<li>
<p><code>OAuth2AuthorizationServerConfig</code> configures the open banking side using Spring Authorization Server. It defines two more filter chains: the authorization-server chain (authorize, token, consent, and related endpoints) and a resource chain for the third-party-facing accounts and consents APIs, which validates tokens with a separate <code>openbankingTokenJwtDecoder</code> that requires a <code>purpose</code> claim of open banking. Registered third-party clients load from the <code>registered_tpps</code> database table through <code>RegisteredTppClientAdapter</code> (see the oauth2 section). The config keeps consent required on every authorization (a deliberately no-op <code>OAuth2AuthorizationConsentService</code>, so consent is re-collected each ceremony) and JDBC-backed authorization storage, and wires the <code>oauth2</code> package&#8217;s validators and customizers into the provider chain.</p>
</li>
<li>
<p><code>JwtConfig</code> loads the ES256 elliptic-curve signing keypair from a PEM file (<code>JwtProperties.keyLocation</code>) and exposes it as a bean; the same key signs consumer and open banking tokens.</p>
</li>
<li>
<p><code>AsyncConfig</code> enables <code>@Async</code> and scheduling (used by the audit listeners and the audit retention job). <code>PasswordEncoderConfig</code> exposes Spring&#8217;s delegating password encoder. <code>OpenApiConfig</code> configures the springdoc OpenAPI document, including the cookie security scheme. The <code>*Properties</code> classes (<code>JwtProperties</code>, <code>AuthenticationProperties</code>, <code>RateLimitProperties</code>, <code>OAuth2ConsumerProperties</code>) bind configuration values.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_exception">exception</h4>
<div class="paragraph">
<p>Global exception handling and translation of errors into the frontend contract.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>AbstractConsumerException</code> is the base class every feature exception extends. It carries an <code>HttpStatus</code>, a machine-readable <code>code</code> string (convention <code>error.msg.consumer.&lt;scope&gt;.&lt;condition&gt;</code>), and a safe default message. The throw site supplies nothing; the exception class encapsulates all three.</p>
</li>
<li>
<p><code>ConsumerApiError</code> is the response body: <code>code</code> plus <code>defaultMessage</code>. Clients branch and localize on <code>code</code>; the message is a fallback.</p>
</li>
<li>
<p><code>ConsumerExceptionHandler</code> is a <code>@RestControllerAdvice</code> at highest precedence with a single handler for the whole <code>AbstractConsumerException</code> hierarchy. It logs 5xx responses with the stack trace and 4xx as a warning without one, then serializes the error body. Adding a new feature exception therefore requires no handler changes.</p>
</li>
<li>
<p>Framework-thrown exceptions that are not part of the hierarchy each get a small dedicated handler: <code>MethodArgumentNotValidExceptionHandler</code> (Bean Validation failures), <code>HttpMessageNotReadableExceptionHandler</code> (malformed JSON), <code>MissingRequestHeaderExceptionHandler</code>, and <code>DefaultExceptionHandler</code> as the catch-all that returns a generic 500 without leaking internals.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_fineractclient">fineractclient</h4>
<div class="paragraph">
<p>The single gateway to upstream Fineract Core. The Fineract Core Integration section covers it in depth; in summary:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The client is generated at build time from Fineract&#8217;s OpenAPI specification into <code>infrastructure.fineractclient.generated.api</code> and <code>.model</code> (source root <code>build/generated/fineractclient</code>). Feature services inject typed API classes such as <code>SavingsAccountApi</code> or <code>ClientApi</code>.</p>
</li>
<li>
<p><code>service/FineractCaller</code> is a static wrapper that executes a client call and translates Feign exceptions (404, 400, 425 Too Early for idempotent replays in progress, and everything else) into the calling feature&#8217;s own exceptions, so upstream error shapes never leak.</p>
</li>
<li>
<p><code>interceptors/</code> attach the service-account basic-auth header, the Fineract tenant header, and the derived idempotency key to every outbound request. <code>configs/</code> holds the Feign configuration and <code>FineractClientProperties</code>; <code>data/FineractHeaders</code> names the header constants.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Generated model types must not escape the service layer; features map them into their own <code>data/</code> classes.</p>
</div>
</div>
<div class="sect3">
<h4 id="_idempotency">idempotency</h4>
<div class="paragraph">
<p>The idempotency-key concern (a client-supplied key that makes retrying a write safe, because the upstream recognizes the repeat). The Idempotency section covers it in depth; in summary: <code>IdempotencyKeyPolicyEvaluator</code> validates the <code>Idempotency-Key</code> header format, <code>IdempotencyKeyDeriver</code> derives a per-user key (SHA-256, base64url) into the <code>DerivedIdempotencyKey</code> value object, and the request-scoped <code>IdempotencyKeyHolder</code> carries it to <code>FineractIdempotencyKeyInterceptor</code> in <code>fineractclient</code>, which forwards it upstream. <code>IdempotencyKeyMalformedException</code> covers the invalid-format case.</p>
</div>
</div>
<div class="sect3">
<h4 id="_jwt">jwt</h4>
<div class="paragraph">
<p>Token minting. The security chapter has details; in summary: <code>service/JwtIssuer</code> signs ES256 tokens with a random <code>jti</code>, the configured issuer, a subject, arbitrary claims, and a caller-chosen time to live, returning the <code>data/IssuedJwt</code> value object. <code>data/JwtClaims</code> names every custom claim (<code>purpose</code>, device fingerprint, <code>kyc_verified</code>, scope, and so on) so producers and validators share constants. Validation and enforcement of those claims live in <code>access</code> and in the decoders configured in <code>configs</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_kyc">kyc</h4>
<div class="paragraph">
<p>The live client-standing check. <code>service/ClientStandingChecker.isActive(fineractClientId)</code> calls Fineract&#8217;s <code>ClientApi</code> and returns true only when the client&#8217;s status id equals 300 (Fineract&#8217;s active status). A 404 from Fineract returns false; any other upstream failure propagates, which aborts the token mint rather than defaulting to active. The check is deliberately uncached: every token mint pays a live upstream round trip, and in exchange the verification status is always current and a Fineract outage fails closed.</p>
</div>
<div class="paragraph">
<p>It runs at every token mint so verification status is never carried forward from an older token: <code>AuthenticationCommandServiceImpl</code> calls it when establishing a session (login, 2FA, refresh), and <code>OAuth2AccessTokenCustomizer</code> calls it when minting open banking access tokens.</p>
</div>
</div>
<div class="sect3">
<h4 id="_oauth2">oauth2</h4>
<div class="paragraph">
<p>Open banking OAuth2 plumbing that plugs into Spring Authorization Server (wired by <code>OAuth2AuthorizationServerConfig</code>). PKCE (Proof Key for Code Exchange) is enforced for the authorization-code flow.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>filter/OAuth2UserAuthenticationFilter</code> lets the logged-in consumer&#8217;s cookie JWT authenticate requests to the authorization endpoint, so the consent ceremony reuses the normal login session instead of a second login.</p>
</li>
<li>
<p><code>service/OAuth2ConsentAuthorizeRequestValidator</code> validates the consent id in an incoming authorization request against the stored consent (via <code>OAuth2ConsentLookupPort</code>). <code>OAuth2ConsentDecisionCustomizer</code> records the user&#8217;s grant decision through <code>OAuth2ConsentRecorderPort</code> and publishes an audit event. <code>OAuth2ConsentIdExtractor</code> pulls the consent id from request parameters. <code>OAuth2RefreshTokenConsentValidator</code> wraps the stock refresh-token provider so a refresh fails if the underlying consent has been revoked. <code>OAuth2AccessTokenCustomizer</code> adds the BFF&#8217;s claims to third-party access tokens and performs the live KYC check described above.</p>
</li>
<li>
<p><code>data/OAuth2Constants</code> centralizes endpoint paths, chain ordering, and the token <code>purpose</code> value; <code>OAuth2ConsentData</code> is the port-level consent shape.</p>
</li>
<li>
<p><code>domain/RegisteredTpp</code>, <code>repository/RegisteredTppRepository</code>, and <code>service/RegisteredTppClientAdapter</code> form the TPP (third-party provider) client registry. Each TPP is a row in the <code>registered_tpps</code> table (Liquibase changeset <code>008-create-registered-tpps.yaml</code>): client id, hashed client secret, name, redirect URI, comma-separated scopes, and an <code>ACTIVE</code> or <code>REVOKED</code> status (<code>data/RegisteredTppStatus</code>). The adapter implements Spring&#8217;s <code>RegisteredClientRepository</code>; lookups return only <code>ACTIVE</code> rows, mapped to <code>RegisteredClient</code> instances with PKCE required, consent required on every authorization, and non-reusable refresh tokens. <code>save</code> throws <code>UnsupportedOperationException</code>: rows are onboarded out of band (the seed scripts insert them), and dynamic client registration is not enabled.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The two ports are implemented by the <code>openbanking</code> feature module, which owns consent persistence.</p>
</div>
</div>
<div class="sect3">
<h4 id="_otp">otp</h4>
<div class="paragraph">
<p>The OTP (one-time password) capability consumed by login 2FA, registration email verification, password change and reset, and the step-up ceremonies. The One-Time Passwords section of the Features chapter covers it in depth. In summary:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>service/OtpService</code> (implemented by <code>OtpServiceImpl</code>) generates a six-character code, hands the raw code to <code>service/OtpEmailDeliveryService</code> for SMTP delivery, and stores only an unsalted SHA-256 hash. <code>validateOtp</code> compares hashes, deletes the code on success (single use), and throws a caller-supplied exception on failure so each flow surfaces its own error.</p>
</li>
<li>
<p><code>repository/OtpRepository</code> keeps all state in Valkey: <code>otp:pending:{publicId}</code> holds the hash and <code>otp:attempts:{publicId}</code> counts failed validations, both with a 300 second TTL. Five failures burn the pending code.</p>
</li>
<li>
<p><code>data/</code> holds <code>OtpConstants</code> (TTL, attempt cap, delivery-method names), <code>OtpDestination</code>, <code>OtpMetadata</code>, and <code>PendingOtp</code>; <code>exception/</code> holds the invalid-token, invalid-destination, and delivery-failed exceptions.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p><code>authentication</code>, <code>registration</code>, <code>user</code>, <code>transfers</code>, and <code>beneficiaries</code> consume the service. Email is the only implemented delivery channel, and there are no OTP database tables.</p>
</div>
</div>
<div class="sect3">
<h4 id="_stepup">stepup</h4>
<div class="paragraph">
<p>Step-up authentication: requiring a fresh proof (an OTP challenge) immediately before a sensitive action, on top of an already valid session. <code>service/StepUpTokenService</code> does two things:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>actionFingerprint(&#8230;&#8203;)</code> hashes the canonical parameters of the pending action (endpoint plus accounts plus amount, SHA-256 hex), so the proof is bound to one specific action and cannot be replayed for a different transfer.</p>
</li>
<li>
<p><code>issue(&#8230;&#8203;)</code> mints a short-lived JWT (via <code>JwtIssuer</code>) carrying <code>purpose=stepup</code>, the device fingerprint, and the action fingerprint; <code>verify(&#8230;&#8203;)</code> checks all three claims plus the subject.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p><code>data/StepUpConstants</code> holds the purpose value and related constants. The initiate/confirm ceremonies in <code>transfers</code>, <code>beneficiaries</code>, and <code>user</code> (password change) consume this service: initiate computes the fingerprint and triggers an OTP, confirm presents the step-up token together with the action.</p>
</div>
</div>
<div class="sect3">
<h4 id="_web">web</h4>
<div class="paragraph">
<p>Small web-boundary helpers, split data and behavior:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>data/ConsumerHeaders</code> names the custom request headers <code>X-Device-Fingerprint</code> and <code>Idempotency-Key</code>.</p>
</li>
<li>
<p><code>data/PasswordPolicy</code> holds the password input-format constants (minimum length 15, maximum 64, and the complexity regular expression) referenced from request DTO Bean Validation annotations.</p>
</li>
<li>
<p><code>service/EmailMaskingService</code> is a static utility that masks an email address for logs and OTP delivery notices (<code>a***@example.com</code>).</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The rate-limiting and device-fingerprint filters live in <code>access/filter</code>, not here.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_3">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p><strong>One shared home for cross-cutting code.</strong> Without a designated infrastructure module, every feature would grow a private copy of security checks, error handling, and Fineract plumbing, and the copies would drift. Centralizing them makes conventions such as the error body and the ABAC check uniform by construction.</p>
</li>
<li>
<p><strong>Ports keep the dependency arrow one-way.</strong> Infrastructure sometimes needs feature-owned data (users, consents). Defining the interface in infrastructure and implementing it in the feature preserves "features depend on infrastructure" without moving feature persistence into shared code, and the Modulith cycle check backs the rule with a failing test.</p>
</li>
<li>
<p><strong>Policy as data.</strong> Expressing ABAC rules as <code>ActionPolicy</code> entries in one table, rather than <code>if</code> statements scattered through services, makes the authorization surface reviewable in a single file and keeps a heavier policy engine unnecessary.</p>
</li>
<li>
<p><strong>A single upstream gateway.</strong> Generating the Fineract client and funneling every call through <code>FineractCaller</code> keeps the upstream contract in one regenerated place and guarantees Fineract&#8217;s error and response shapes never reach the browser.</p>
</li>
<li>
<p><strong>Contract and storage separated for audit.</strong> Features publish audit events against a tiny infrastructure contract; the audit feature module owns persistence and retention. Publishers never couple to the audit schema.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_2">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>No correlation id or structured request logging yet.</strong> The web package contains only header constants, a password policy, and an email masker. Propagating a correlation id from inbound requests through Feign calls to Fineract remains future work.</p>
</li>
<li>
<p><strong>Valkey is a hard runtime dependency.</strong> Rate limiting, the JWT denylist, OTP storage, and the level-2 ownership cache all assume a reachable Valkey; degraded-mode behavior when it is unavailable is not uniformly defined across these consumers.</p>
</li>
<li>
<p><strong>No tracing or metrics backend is bundled.</strong> Production deployments wire Actuator and Micrometer into their own observability stack.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_persistence">Persistence</h3>
<div class="sect3">
<h4 id="_two_systems_of_record">Two systems of record</h4>
<div class="paragraph">
<p>The BFF runs against its own PostgreSQL database (the <code>bff-db</code> service in <code>consumer/compose.yaml</code>). This database holds only the state the BFF itself is responsible for: consumer identity, authentication artifacts, transfer beneficiaries, audit events, open banking consents, registered third-party (TPP) clients, and infrastructure bookkeeping.</p>
</div>
<div class="paragraph">
<p>Financial data never lives in the BFF database. Savings accounts, loans, transactions, products, and client records are owned by Fineract Core and reached over Feign (a declarative HTTP client: you write a Java interface, the library generates the HTTP calls). The BFF stores at most a numeric reference to a Fineract resource, for example <code>users.client_id</code> (the bound Fineract client) or <code>beneficiaries.fineract_account_id</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_owned_tables">BFF-owned tables</h4>
<div class="paragraph">
<p>Each table is created by one Liquibase changeset and mapped by JPA entities under the owning feature module.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Module</th>
<th class="tableblock halign-left valign-top">Table</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>user</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>users</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">One row per registered consumer: email, password hash, bound Fineract client id, binding status (<code>PENDING_OTP</code> or <code>BOUND</code>). Entity: <code>user.command.domain.User</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>authentication</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>refresh_tokens</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Rotating refresh tokens. Stores a SHA-256 hex hash of the token value (<code>token_hash</code>, never the raw token), the device fingerprint it is bound to, expiry, revocation timestamp, and a <code>rotated_to</code> self-reference forming the rotation chain. Entity: <code>authentication.command.domain.RefreshToken</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>beneficiaries</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>beneficiaries</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Saved transfer destinations per user, with account type, optional transfer limit, and Fineract office/client/account references. Entity: <code>beneficiaries.command.domain.Beneficiary</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>audit</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>audit_events</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The structured audit log for both server-emitted and client-reported events: source, type, severity, device fingerprint, correlation id, client-claimed timestamp plus authoritative server receive time, and a JSONB <code>details</code> column. Entity: <code>audit.command.domain.AuditEvent</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>openbanking</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>open_banking_consents</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Third-party (TPP) consent records: granting user, permission set, status (<code>AWAITING_AUTHORISATION</code>, <code>AUTHORISED</code>, <code>REJECTED</code>, <code>REVOKED</code>), and expiry. Entity: <code>openbanking.command.domain.OpenBankingConsent</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>infrastructure</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>event_publication</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring Modulith&#8217;s event outbox (a table that records in-process domain events until their listeners complete, so events survive a crash). Completed rows are deleted (<code>spring.modulith.events.completion-mode=delete</code>).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>infrastructure</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>oauth2_authorization</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring Authorization Server state for the open banking OAuth2 flow (authorization codes, access and refresh tokens issued to TPPs). Persisted by <code>JdbcOAuth2AuthorizationService</code>, wired in <code>OAuth2AuthorizationServerConfig</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>infrastructure</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>registered_tpps</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The OAuth2 client registry: one row per onboarded third-party provider (TPP). Columns: unique <code>client_id</code>, <code>client_secret_hash</code> (a bcrypt hash carrying the delegating-encoder <code>{bcrypt}</code> prefix; the raw secret is never stored), <code>client_name</code>, <code>redirect_uri</code>, <code>scopes</code>, <code>status</code> (<code>ACTIVE</code> or <code>REVOKED</code>), and onboarding/status timestamps. Entity: <code>infrastructure.oauth2.domain.RegisteredTpp</code>, surfaced to Spring Authorization Server by <code>RegisteredTppClientAdapter</code> (a <code>RegisteredClientRepository</code>). Rows are onboarded out-of-band by the seed scripts; dynamic client registration is not enabled (the adapter&#8217;s <code>save</code> throws).</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Because the module uses CQRS (command/query responsibility segregation: writes and reads are separate code paths), most tables are mapped twice: a mutable command-side entity and a read-only <code>@Immutable</code> query-side twin over the same table (for example <code>User</code> and <code>UserQueryEntity</code>). There is still exactly one store and one schema. Infrastructure-owned entities are side-agnostic and mapped once: <code>RegisteredTpp</code> has no query-side twin.</p>
</div>
</div>
<div class="sect3">
<h4 id="_liquibase">Liquibase</h4>
<div class="paragraph">
<p>Liquibase is a database migration tool: every schema change is a versioned changeset applied in order, and the applied history is recorded in the database itself. The changelog root is <code>consumer/src/main/resources/db/changelog/db.changelog-master.yaml</code>, which includes one changeset file per table from per-module directories:</p>
</div>
<div class="listingblock">
<div class="content">
<pre>db/changelog/
├── db.changelog-master.yaml
├── user/001-create-users-table.yaml
├── authentication/002-create-refresh-tokens.yaml
├── beneficiaries/003-create-beneficiaries.yaml
├── audit/004-create-audit-events.yaml
├── infrastructure/005-create-event-publication.yaml
├── openbanking/006-create-open-banking-consents.yaml
├── infrastructure/007-create-oauth2-authorization.yaml
└── infrastructure/008-create-registered-tpps.yaml</pre>
</div>
</div>
<div class="paragraph">
<p>Every changeset carries a <code>rollback</code> block. Changesets use PostgreSQL-native features where they earn their keep: native enum types (<code>user_status</code>, <code>beneficiary_account_type</code>, <code>open_banking_consent_status</code>, <code>registered_tpp_status</code>), JSONB, and partial unique indexes (<code>uq_beneficiaries_user_name</code> applies only to active rows).</p>
</div>
<div class="paragraph">
<p>Two rules follow from this setup:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>All schema changes go through changesets. Hibernate never generates or alters schema: <code>application.properties</code> sets <code>spring.jpa.hibernate.ddl-auto=validate</code>, which only checks that entities match the schema Liquibase built and fails startup on drift. No profile uses <code>update</code>.</p>
</li>
<li>
<p>The Liquibase version is pinned in <code>consumer/build.gradle</code> (<code>set('liquibase.version', "4.33.0")</code>), overriding the version Spring Boot&#8217;s dependency management would otherwise pick. The pin is deliberate: 4.33.0 is the newest Liquibase release under an Apache Category A license, so do not remove the pin or let the Boot BOM float the version.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_identifier_conventions">Identifier conventions</h4>
<div class="paragraph">
<p>Externally visible identifiers are UUIDs; internal primary keys are numeric where a table is never addressed from outside by its key.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>users</code> has a <code>BIGINT</code> identity primary key for internal foreign keys, plus a unique <code>public_id UUID</code>. The UUID is what leaves the service: it is the JWT <code>sub</code> claim and the value idempotency keys are derived from. The numeric id never appears in an API response.</p>
</li>
<li>
<p><code>beneficiaries</code> follows the same pattern (<code>id BIGINT</code> plus <code>public_id UUID</code>).</p>
</li>
<li>
<p><code>audit_events</code> has a numeric primary key plus a unique <code>event_uuid</code> used for client-side deduplication.</p>
</li>
<li>
<p><code>refresh_tokens</code> has a numeric primary key only; the token is addressed by its hash, never by id, so no public UUID is needed.</p>
</li>
<li>
<p><code>open_banking_consents</code> uses a UUID as its primary key directly, since the consent id is itself the externally shared handle in the consent flow.</p>
</li>
<li>
<p><code>registered_tpps</code> also uses a UUID primary key directly; it doubles as the Spring Authorization Server <code>RegisteredClient</code> id.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_secrets_at_rest">Secrets at rest</h4>
<div class="paragraph">
<p>No BFF table stores a recoverable secret, so the schema needs hashing rather than encryption:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Passwords are stored as <code>users.password_hash</code>, produced by Spring Security&#8217;s delegating <code>PasswordEncoder</code> (<code>PasswordEncoderConfig</code>).</p>
</li>
<li>
<p>Refresh tokens are stored as SHA-256 hashes (<code>AuthenticationCommandServiceImpl.sha256Hex</code>); a database dump cannot be replayed as a token.</p>
</li>
<li>
<p>OTP codes are stored only as SHA-256 hashes in Valkey with a short TTL (see below), never in PostgreSQL.</p>
</li>
<li>
<p>TPP client secrets are stored as bcrypt hashes (<code>registered_tpps.client_secret_hash</code>); Spring Authorization Server verifies a presented secret against the hash through the delegating <code>PasswordEncoder</code>, keyed by the <code>{bcrypt}</code> prefix.</p>
</li>
<li>
<p>Raw government ID numbers are never persisted. During registration the BFF compares the user-supplied ID against Fineract&#8217;s stored identifier in memory and stores only the binding outcome on the <code>users</code> row.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The engineering standard for this repository requires that if an ID number or other recoverable secret is ever persisted, it must go through a JPA <code>AttributeConverter</code> (a class JPA calls to transform a field on the way to and from its column) that encrypts the value, with the encryption keys held in a KMS (a key management service that stores keys outside the application) in production. The only <code>AttributeConverter</code> in the codebase is <code>OpenBankingPermissionSetConverter</code> (one copy per CQRS side, in <code>openbanking.command.domain</code> and <code>openbanking.query.domain</code>), which serializes a permission enum set to a comma-separated string; it is a formatting converter, not a cryptographic one.</p>
</div>
</div>
<div class="sect3">
<h4 id="_caching_layer_valkey">Caching layer: Valkey</h4>
<div class="paragraph">
<p>Valkey is a Redis-compatible in-memory key-value store; the BFF reaches it through Spring&#8217;s <code>spring.data.redis.*</code> client stack, and the <code>valkey</code> service in <code>consumer/compose.yaml</code> provides it locally. It holds ephemeral state that must be shared across BFF instances but has no business value beyond its TTL:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Key prefix</th>
<th class="tableblock halign-left valign-top">Behavior</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>JwtDenylist</code> (<code>infrastructure.access</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>jwt:denylist:</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Logout and revocation marks for JWTs that are otherwise valid until expiry. Entries live for the token&#8217;s remaining lifetime plus a clock-skew pad. Fails closed: if Valkey is unreachable, tokens are treated as denied.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>OtpRepository</code> (<code>infrastructure.otp</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>otp:pending:</code>, <code>otp:attempts:</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SHA-256 hash of the pending OTP and a failed-attempt counter, both expiring after <code>OtpConstants.OTP_TTL_SECONDS</code> (300 seconds).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>RateLimitCounter</code> (<code>infrastructure.access</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ratelimit:</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Per-user request counters over a 60 second window. Fails open: if Valkey is unreachable, the request is allowed and the failure is logged.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>OwnedAccountsCache</code> (<code>infrastructure.access</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>abac:ownership:</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The set of savings and loan accounts a Fineract client owns, used by ABAC ownership checks. Two tiers: an in-process Caffeine cache (60 second TTL) in front of Valkey (300 second TTL), with explicit eviction after writes that change ownership, such as submitting a loan application.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_repositories_own_queries">Repositories own queries</h4>
<div class="paragraph">
<p>Data access follows Spring Data conventions: each feature entity has a per-side repository interface (<code>&lt;Feature&gt;CommandRepository</code> / <code>&lt;Feature&gt;QueryRepository</code>) extending <code>JpaRepository</code>, and any query too complex for method-name derivation lives on the repository as a <code>@Query</code> or a custom fragment. Infrastructure entities have a single side-agnostic repository (<code>RegisteredTppRepository</code>). Services never assemble JPQL inline; they call a named repository method and act on the result. Valkey adapters such as <code>OtpRepository</code> (<code>infrastructure.otp.repository</code>) are hand-rolled <code>@Repository</code> classes over <code>StringRedisTemplate</code> because they are not JPA-backed.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_4">Design rationale</h4>
<div class="paragraph">
<p>Keeping financial data out of the BFF database avoids a second system of record: there is no reconciliation problem between BFF and Fineract because balances, transactions, and account state have exactly one home. The BFF persists only what Fineract cannot represent, which is consumer-channel identity and policy state.</p>
</div>
<div class="paragraph">
<p>Hashing instead of encrypting the secrets the BFF does hold (passwords, refresh tokens, OTPs) removes key management from the threat model for those columns: verification only ever needs equality against a hash, so a recoverable ciphertext would add risk without adding function.</p>
</div>
<div class="paragraph">
<p>The Valkey split exists because this state is cross-instance but disposable. A denylist entry or rate-limit counter must be visible to every replica immediately, but losing it costs at most one token lifetime or one rate window. Putting it in PostgreSQL would add write load and vacuum churn for rows that expire in minutes.</p>
</div>
<div class="paragraph">
<p>Liquibase-only schema management with <code>ddl-auto=validate</code> makes the schema reviewable in pull requests and identical across dev, CI, and production; Hibernate drift is caught at startup instead of silently patched.</p>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_3">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>TPP token values are not hashed at rest.</strong> The <code>oauth2_authorization</code> table stores TPP access and refresh token values as plain <code>TEXT</code>, which is Spring Authorization Server&#8217;s default JDBC schema. This is unlike the consumer <code>refresh_tokens</code> table and the TPP client secrets in <code>registered_tpps</code>, which are hashed.</p>
</li>
<li>
<p><strong>The audit details column is unconstrained at the schema level.</strong> <code>audit_events.details</code> is free-form JSONB guarded by the PII screen at write time; nothing in the schema prevents sensitive data from landing there if the screen misses a pattern.</p>
</li>
<li>
<p><strong>Local databases are wiped on every restart.</strong> The containers use <code>tmpfs</code> volumes, which suits local development and tests; real deployments use persistent volumes.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="idempotency">Idempotency</h3>
<div class="paragraph">
<p>Idempotency means a retried write request must not execute twice. If a browser resends a transfer confirmation because a response timed out, money must move once. The BFF achieves this without storing any request or response state of its own: it derives a stable key from the client-supplied header and delegates deduplication and response replay to Fineract Core, which already implements Idempotency-Key semantics for its command endpoints.</p>
</div>
<div class="sect3">
<h4 id="_which_endpoints_require_a_key">Which endpoints require a key</h4>
<div class="paragraph">
<p>Only endpoints whose upstream effect is a non-idempotent Fineract write take a key. Each declares the header as a required <code>@RequestHeader</code> parameter, so a request without it is rejected before any service code runs.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Endpoint</th>
<th class="tableblock halign-left valign-top">Controller</th>
<th class="tableblock halign-left valign-top">Fineract write</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/loans</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansCommandController.submit</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit a loan application.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>PUT /api/v1/loans/{loanId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansCommandController.modify</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Modify a pending loan application.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/loans/{loanId}?command=withdrawnByApplicant</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansCommandController.withdraw</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Withdraw a loan application.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/transfers/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersCommandController.confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Execute an account transfer to a savings account, or to a loan account for a loan repayment; both destinations run through this endpoint. The sibling <code>POST /api/v1/transfers/initiate</code> takes no key because it only sends an OTP and issues a step-up token; nothing upstream is written. The transfer history read, <code>GET /api/v1/transfers</code> on <code>TransfersQueryController</code>, is a query and likewise takes no key.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Other writes (registration, login, beneficiary management, audit ingestion) do not take the header. They either mutate only BFF state under database constraints, or are naturally idempotent, or (for client audit events) deduplicate on the event UUID instead.</p>
</div>
</div>
<div class="sect3">
<h4 id="_the_header_and_its_format">The header and its format</h4>
<div class="paragraph">
<p>The client sends the key in the <code>Idempotency-Key</code> header, named by the constant <code>ConsumerHeaders.IDEMPOTENCY_KEY</code> in <code>infrastructure.web.data</code>. Before anything else, the controller calls <code>IdempotencyKeyPolicyEvaluator.validate(rawKey)</code>: the key must be 1 to 64 visible ASCII characters. A malformed key raises <code>IdempotencyKeyMalformedException</code> (HTTP 400, code <code>error.msg.consumer.idempotency.key.malformed</code>). A missing header is translated by <code>MissingRequestHeaderExceptionHandler</code> to HTTP 400 with code <code>error.msg.consumer.request.header.missing</code>.</p>
</div>
<div class="paragraph">
<p>The Angular client generates a fresh UUID per logical action and reuses it across retries of that action.</p>
</div>
</div>
<div class="sect3">
<h4 id="_key_derivation_and_per_user_scoping">Key derivation and per-user scoping</h4>
<div class="paragraph">
<p>The raw client key is never sent upstream. The command service derives the forwarded key with <code>IdempotencyKeyDeriver.derive(userPublicId, rawKey)</code> in <code>infrastructure.idempotency.service</code>:</p>
</div>
<div class="listingblock">
<div class="content">
<pre>derivedKey = base64url( SHA-256( userPublicId + ":" + rawKey ) )</pre>
</div>
</div>
<div class="paragraph">
<p>Prefixing the caller&#8217;s public UUID before hashing scopes every key to one user. Two users who happen to send the same raw key can never collide on Fineract&#8217;s deduplication table, and a client cannot replay another user&#8217;s cached response by guessing their key. The digest also normalizes length: whatever the client sends, Fineract always receives a 43-character base64url string, comfortably inside its column limit.</p>
</div>
<div class="paragraph">
<p>The derived value travels as the value object <code>DerivedIdempotencyKey</code> (in <code>infrastructure.idempotency.data</code>), not a bare <code>String</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_how_the_key_reaches_fineract">How the key reaches Fineract</h4>
<div class="paragraph">
<p>The plumbing is a request-scoped holder plus a Feign interceptor, so command services never touch HTTP headers directly:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>The command service (for example <code>LoansCommandServiceImpl.callWithIdempotency</code>) derives the key and places it in <code>IdempotencyKeyHolder</code>, a request-scoped bean (one instance per HTTP request) registered in <code>FineractClientConfig</code>. The set and the upstream call are wrapped in <code>try/finally</code> so the holder is cleared even when the call throws.</p>
</li>
<li>
<p><code>FineractIdempotencyKeyInterceptor</code> (in <code>infrastructure.fineractclient.interceptors</code>) runs on every outbound Feign request. If the holder is populated and the outbound method is not GET, it adds the <code>Idempotency-Key</code> header (constant <code>FineractHeaders.IDEMPOTENCY_KEY</code>). GET requests are skipped so that lookups the service performs inside the same window, such as the client and account reads before a transfer, are never accidentally deduplicated.</p>
</li>
<li>
<p>The holder is cleared in <code>finally</code>, so a later write in the same HTTP request cannot inherit a stale key.</p>
</li>
</ol>
</div>
</div>
<div class="sect3">
<h4 id="_storage_replay_ttl">Storage, replay, TTL</h4>
<div class="paragraph">
<p>The BFF stores nothing. Fineract Core keeps the tuple (idempotency key, action, entity) with the completed response in its command source table:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>First request: Fineract executes the command, stores the result, and returns it.</p>
</li>
<li>
<p>Retry after completion: Fineract returns the originally stored response body without re-executing. The BFF maps it exactly as it maps a first response, so a retried loan submission returns the same <code>loanId</code> and the Cucumber suite asserts only one loan exists.</p>
</li>
<li>
<p>Retry while the first attempt is still running: Fineract answers HTTP 425 (Too Early). <code>FineractCaller</code> (the shared Feign exception translator in <code>infrastructure.fineractclient.service</code>) has a dedicated overload that maps 425 to a feature exception, <code>LoanCommandInProgressException</code> or <code>TransferInProgressException</code>, telling the client to retry later rather than treating it as failure.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>There is no TTL or eviction on the BFF side because there is no BFF-side record. Retention of the deduplication records is governed entirely by Fineract&#8217;s command source housekeeping.</p>
</div>
</div>
<div class="sect3">
<h4 id="_test_coverage">Test coverage</h4>
<div class="ulist">
<ul>
<li>
<p>Unit tests: <code>IdempotencyKeyPolicyEvaluatorTest</code> (format rules), <code>IdempotencyKeyDeriverTest</code> (derivation), <code>IdempotencyKeyHolderTest</code> (holder semantics), and <code>FineractIdempotencyKeyInterceptorTest</code> (header set for non-GET, skipped for GET, absent when the holder is empty or cleared).</p>
</li>
<li>
<p>Service tests: <code>LoansCommandServiceImplTest</code> and <code>TransfersCommandServiceImplTest</code> verify with ordered mocks that the derived key is set before the upstream call, cleared afterwards, cleared on upstream failure, and that a 425 replay maps to the in-progress exception.</p>
</li>
<li>
<p>Controller tests: <code>LoansCommandControllerTest</code> and <code>TransfersCommandControllerTest</code> cover header validation at the boundary, and <code>MissingRequestHeaderExceptionHandlerTest</code> covers the missing-header translation.</p>
</li>
<li>
<p>End-to-end: <code>loans.feature</code> submits the same application twice with one key and asserts one loan exists, and rejects a submission without a key; <code>transfers.feature</code> confirms a transfer twice with one key and asserts money moved once, then repeats with two different keys and asserts money moved twice.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_5">Design rationale</h4>
<div class="paragraph">
<p>Delegating deduplication to Fineract avoids building a second replay store that would have to be transactionally consistent with the first. Fineract already binds the key to the executed command and its response in the same database transaction as the write; a BFF-side cache could only ever approximate that, and would reintroduce the double-execution window it exists to close.</p>
</div>
<div class="paragraph">
<p>The holder-plus-interceptor shape keeps the concern in one place. Command services state the intent (this block runs under this key) and the Feign layer owns the wire detail; no service formats headers, and the GET exclusion is enforced once for every client rather than per call site.</p>
</div>
<div class="paragraph">
<p>Hashing the user id into the key makes cross-tenant replay a non-issue by construction instead of by policy, and means the raw client-chosen key, which clients sometimes build from meaningful data, never leaves the BFF.</p>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_4">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>Idempotency covers only the Fineract write itself.</strong> BFF-local side effects around the call are not replay-aware: a retried loan submission that Fineract serves from its cache still re-runs the ownership-cache eviction (harmless) and would re-run any future local write placed in that path (not harmless). If a command ever pairs a local mutation with the upstream write, it will need a BFF-side idempotency record.</p>
</li>
<li>
<p><strong>Clients cannot tell replays from first executions.</strong> The BFF does not surface Fineract&#8217;s <code>x-served-from-cache</code> response header, so a client cannot distinguish the two.</p>
</li>
<li>
<p><strong>Registration and beneficiary creation rely on database uniqueness.</strong> This prevents duplicates but returns a conflict error on retry instead of replaying the original success. True retry transparency there would require the same header treatment.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="fineract-integration">Fineract Core Integration</h3>
<div class="sect3">
<h4 id="_overview">Overview</h4>
<div class="paragraph">
<p>All communication with upstream Fineract Core goes through one infrastructure package:</p>
</div>
<div class="listingblock">
<div class="content">
<pre>consumer/src/main/java/org/apache/fineract/consumer/infrastructure/fineractclient/
├── configs/       FineractClientConfig, FineractClientProperties, FineractFeignConfig
├── data/          FineractHeaders (header-name constants)
├── interceptors/  FineractBasicAuthInterceptor, FineractTenantHeaderInterceptor,
│                  FineractIdempotencyKeyInterceptor
├── service/       FineractCaller (exception translation helper)
├── spec/          fineract.json (vendored Fineract OpenAPI spec) + fineract.ignore
└── templates/     apiClient.mustache (custom generator template)</pre>
</div>
</div>
<div class="paragraph">
<p>The transport is Feign, a declarative HTTP client: you write a Java interface with annotated methods, and Spring Cloud OpenFeign generates the HTTP calls at runtime. Feign is enabled application-wide in <code>ConsumerApplication</code> via <code>@EnableFeignClients(basePackages = "org.apache.fineract.consumer", defaultConfiguration = FineractFeignConfig.class)</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_the_generated_feign_client">The generated Feign client</h4>
<div class="paragraph">
<p>The Feign interfaces are not written by hand. They are generated on every build from a vendored copy of Fineract&#8217;s OpenAPI spec (<code>spec/fineract.json</code>) by two Gradle tasks in <code>consumer/build.gradle</code>:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><code>sanitizeFineractSpec</code> patches known defects in the upstream spec before generation: it strips null-only enums, retypes integer money fields (<code>principal</code>, <code>amount</code>, <code>depositAmount</code>) to <code>number</code>, adds balance fields missing from <code>GetClientsSavingsAccounts</code> and <code>GetClientsLoanAccounts</code>, adds <code>mobileNo</code> and <code>imagePresent</code> to <code>GetClientsClientIdResponse</code>, and fixes the response shapes of the obligee-details and client-image endpoints. The schema-targeted patches (the missing balance and profile fields, the obligee-details fix, and the client-image fix) fail the build with a <code>GradleException</code> if the schema or path they target disappears, so a spec upgrade cannot silently drop those fixes. The enum-stripping and money-retyping passes are pattern-based and simply match nothing if the spec changes.</p>
</li>
<li>
<p><code>generateFineractClient</code> runs the OpenAPI Generator (<code>spring</code> generator, <code>spring-cloud</code> library) over the sanitized spec into <code>build/generated/fineractclient</code>, producing one interface per Fineract API tag under <code>org.apache.fineract.consumer.infrastructure.fineractclient.generated.api</code> and model classes under <code>&#8230;&#8203;generated.model</code>. <code>float</code> and <code>double</code> are mapped to <code>BigDecimal</code> so money is never a binary floating-point type. <code>compileJava</code> depends on this task, so the client is always regenerated before compilation.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>To upgrade Fineract, replace the vendored <code>spec/fineract.json</code> with the new version&#8217;s spec and rebuild. Any schema-targeted sanitize patch whose target has changed fails the build at that point and is updated or retired as part of the upgrade.</p>
</div>
<div class="paragraph">
<p>A custom template, <code>templates/apiClient.mustache</code>, controls the Feign binding. For each tag it emits a pair:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="java"><span class="nd">@FeignClient</span><span class="o">(</span><span class="n">name</span> <span class="o">=</span> <span class="s">"..."</span><span class="o">,</span> <span class="n">url</span> <span class="o">=</span> <span class="s">"\${fineract.client.base-url}"</span><span class="o">,</span>
        <span class="n">configuration</span> <span class="o">=</span> <span class="nc">ClientConfiguration</span><span class="o">.</span><span class="na">class</span><span class="o">)</span>
<span class="kd">public</span> <span class="kd">interface</span> <span class="nc">SavingsAccountApiClient</span> <span class="kd">extends</span> <span class="nc">SavingsAccountApi</span> <span class="o">{</span>
<span class="o">}</span></code></pre>
</div>
</div>
<div class="paragraph">
<p><code>SavingsAccountApi</code> is a plain Java interface carrying the request mappings; <code>SavingsAccountApiClient</code> is the Feign-annotated subinterface that Spring turns into an HTTP proxy. The target URL comes from the <code>fineract.client.base-url</code> property (default <code><a href="http://localhost:8888/fineract-provider/api" class="bare">http://localhost:8888/fineract-provider/api</a></code>, set to <code><a href="http://fineract:8080/fineract-provider/api" class="bare">http://fineract:8080/fineract-provider/api</a></code> in the compose stack).</p>
</div>
</div>
<div class="sect3">
<h4 id="_narrow_interfaces_at_the_seam">Narrow interfaces at the seam</h4>
<div class="paragraph">
<p>Feature services inject the plain <code>*Api</code> interfaces, never the <code>*ApiClient</code> Feign subinterfaces and never a hand-rolled HTTP client. For example, <code>SavingsQueryServiceImpl</code> declares:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="java"><span class="kd">private</span> <span class="kd">final</span> <span class="nc">SavingsAccountApi</span> <span class="n">savingsAccountApi</span><span class="o">;</span>
<span class="kd">private</span> <span class="kd">final</span> <span class="nc">SavingsChargesApi</span> <span class="n">savingsChargesApi</span><span class="o">;</span>
<span class="kd">private</span> <span class="kd">final</span> <span class="nc">SavingsAccountTransactionsApi</span> <span class="n">savingsAccountTransactionsApi</span><span class="o">;</span>
<span class="kd">private</span> <span class="kd">final</span> <span class="nc">SavingsProductApi</span> <span class="n">savingsProductApi</span><span class="o">;</span>
<span class="kd">private</span> <span class="kd">final</span> <span class="nc">ClientApi</span> <span class="n">clientApi</span><span class="o">;</span></code></pre>
</div>
</div>
<div class="paragraph">
<p>Spring satisfies each <code>*Api</code> dependency with the Feign proxy because <code>*ApiClient extends *Api</code>. The effect is that a service depends only on a narrow, tag-scoped Java interface. In a unit test the same interface is mocked directly; nothing Feign-specific leaks into feature code. Hand-written <code>@FeignClient</code> interfaces are the exception, allowed only when the spec genuinely cannot produce a usable client for a call.</p>
</div>
</div>
<div class="sect3">
<h4 id="_authentication_and_tenant_handling">Authentication and tenant handling</h4>
<div class="paragraph">
<p>The BFF authenticates to Fineract as a single service account using HTTP Basic authentication. Two Feign <code>RequestInterceptor</code> beans, registered in <code>FineractClientConfig</code>, apply to every outbound request:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>FineractBasicAuthInterceptor</code> precomputes <code>Authorization: Basic &#8230;&#8203;</code> from <code>fineract.client.username</code> and <code>fineract.client.password</code> (defaults <code>mifos</code>/<code>password</code>, overridable via <code>FINERACT_SERVICE_USERNAME</code> and <code>FINERACT_SERVICE_PASSWORD</code>).</p>
</li>
<li>
<p><code>FineractTenantHeaderInterceptor</code> sets <code>Fineract-Platform-TenantId</code> (the constant <code>FineractHeaders.TENANT_ID</code>) from <code>fineract.client.tenant-id</code> (default <code>default</code>, env <code>FINERACT_SERVICE_TENANT</code>). Fineract is multi-tenant and rejects requests without this header. The BFF targets exactly one tenant.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Because Fineract sees a privileged service account rather than the end user, upstream authorization tells the BFF nothing about the consumer. Every feature service therefore runs the BFF&#8217;s own ABAC checks (<code>AccessPolicyEvaluator</code>, ownership resolution via <code>UserClientResolver</code>) before any Feign call.</p>
</div>
<div class="paragraph">
<p>The generated <code>ClientConfiguration</code> class also declares basic-auth and tenant interceptors, but they are guarded by <code>@ConditionalOnProperty</code> on <code>apachefineractrest.*</code> properties that are never set, so they stay inert. The hand-written interceptors above are the ones in effect.</p>
</div>
</div>
<div class="sect3">
<h4 id="_request_body_encoding_non_empty">Request body encoding: NON_EMPTY</h4>
<div class="paragraph">
<p><code>FineractClientConfig</code> defines a dedicated Feign <code>Encoder</code> bean (<code>fineractFeignEncoder</code>) built on a Jackson <code>JsonMapper</code> rebuilt with <code>JsonInclude.Include.NON_EMPTY</code>. Null and empty properties are omitted from serialized request bodies. This matters because the generated model classes have many optional fields, and Fineract rejects or misinterprets requests that carry explicit nulls for fields the caller did not intend to send.</p>
</div>
</div>
<div class="sect3">
<h4 id="_idempotency_keys">Idempotency keys</h4>
<div class="paragraph">
<p><code>FineractIdempotencyKeyInterceptor</code> adds an <code>Idempotency-Key</code> header (constant <code>FineractHeaders.IDEMPOTENCY_KEY</code>) to every non-GET Fineract request when a key is present. The key comes from a request-scoped <code>IdempotencyKeyHolder</code> bean, populated by the idempotency infrastructure in <code>consumer.infrastructure.idempotency</code> from the client-supplied key (derived per user via SHA-256). GET requests never carry the header. This lets a retried write reach Fineract with the same key, so Fineract can deduplicate it.</p>
</div>
</div>
<div class="sect3">
<h4 id="_error_handling">Error handling</h4>
<div class="paragraph">
<p>There is no custom Feign <code>ErrorDecoder</code>. Non-2xx responses surface as <code>feign.FeignException</code> subclasses, and each feature service translates them at the call site through the <code>FineractCaller</code> helper:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="java"><span class="nc">FineractCaller</span><span class="o">.</span><span class="na">call</span><span class="o">(</span>
        <span class="o">()</span> <span class="o">-&gt;</span> <span class="n">savingsAccountApi</span><span class="o">.</span><span class="na">retrieveSavingsAccount</span><span class="o">(</span><span class="n">savingsId</span><span class="o">,</span> <span class="kc">null</span><span class="o">,</span> <span class="kc">null</span><span class="o">,</span> <span class="kc">null</span><span class="o">),</span>
        <span class="nl">SavingsAccountNotFoundException:</span><span class="o">:</span><span class="k">new</span><span class="o">,</span>      <span class="c1">// 404</span>
        <span class="nl">SavingsRequestInvalidException:</span><span class="o">:</span><span class="k">new</span><span class="o">,</span>       <span class="c1">// 400</span>
        <span class="nl">SavingsUpstreamUnavailableException:</span><span class="o">:</span><span class="k">new</span><span class="o">);</span> <span class="c1">// anything else</span></code></pre>
</div>
</div>
<div class="paragraph">
<p><code>FineractCaller.call</code> catches <code>FeignException.NotFound</code> and <code>FeignException.BadRequest</code> explicitly, and an overload adds a handler for HTTP 425 (Too Early, Fineract&#8217;s "idempotent request still in progress" signal). Every other <code>FeignException</code> maps to the upstream-error handler. The supplied exceptions extend <code>AbstractConsumerException</code>, which carries the HTTP status, a machine-readable error code, and a safe default message, so a raw Fineract error body is never forwarded to the browser.</p>
</div>
</div>
<div class="sect3">
<h4 id="_dto_translation_policy">DTO translation policy</h4>
<div class="paragraph">
<p>Generated Fineract model types (<code>&#8230;&#8203;fineractclient.generated.model.*</code>) are an implementation detail. The rules:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Feature service implementations may consume them, but every public service method returns the feature&#8217;s own <code>*QueryData</code> or <code>*CommandData</code> class from the feature&#8217;s <code>data/</code> package.</p>
</li>
<li>
<p>Controllers, response bodies, audit events, and exceptions never reference a generated model type. The Angular client is generated from the BFF&#8217;s own OpenAPI spec, so a Fineract shape cannot appear in it by construction.</p>
</li>
<li>
<p>Mapping is done with plain private methods in the service implementation (for example <code>toListItem</code>, <code>toAccountData</code> in <code>SavingsQueryServiceImpl</code>), not with a mapping framework.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>This keeps the BFF&#8217;s public contract stable when Fineract&#8217;s API changes: a spec upgrade forces recompilation of the mapping code, not of the consumer-facing API.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_6">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>Generating the client from Fineract&#8217;s spec keeps the entire Fineract surface in one regenerated place instead of drifting across hand-maintained interfaces, and <code>BigDecimal</code> type mapping plus the sanitize step fix upstream spec defects once, centrally.</p>
</li>
<li>
<p>Injecting the plain <code>*Api</code> interfaces gives feature code a mockable seam with zero Feign coupling, which is why unit tests never need HTTP stubs.</p>
</li>
<li>
<p>Per-call exception translation via <code>FineractCaller</code> instead of a global <code>ErrorDecoder</code> keeps the decision "what does a 404 mean here" where the business context lives: a missing savings account and a missing loan are different consumer-facing errors.</p>
</li>
<li>
<p>The NON_EMPTY encoder is scoped to the Fineract client only, so the BFF&#8217;s own API responses are unaffected.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_5">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>No correlation ID is propagated to Fineract.</strong> There is no request-ID Feign interceptor, so cross-system log tracing is manual.</p>
</li>
<li>
<p><strong>Fineract calls have no resilience wrapping.</strong> There is no retry, timeout tuning, or circuit breaker around them, so a slow Fineract stalls BFF request threads.</p>
</li>
<li>
<p><strong>BFF-to-Fineract traffic is cleartext HTTP.</strong> It travels over the Docker network unencrypted. Production needs TLS on this wire; mutual TLS is reserved for connections between open banking providers and the open banking endpoints.</p>
</li>
<li>
<p><strong>Tenant selection is a static property.</strong> Supporting multiple tenants would require deriving the tenant per request instead of per deployment.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_technology_stack">Technology Stack</h3>
<div class="sect3">
<h4 id="_language_and_build">Language and build</h4>
<div class="paragraph">
<p>The BFF is built with Gradle from <code>consumer/build.gradle</code>. Versions below are taken from that file and from <code>consumer/compose.yaml</code>.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Version</th>
<th class="tableblock halign-left valign-top">Notes</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Java</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">21</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Gradle toolchain (<code>JavaLanguageVersion.of(21)</code>).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring Boot</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">4.0.6</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Via the <code>org.springframework.boot</code> Gradle plugin.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring Cloud</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">2025.1.0</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">BOM imported through <code>io.spring.dependency-management</code> 1.1.7.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring Modulith</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">2.0.2</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">BOM <code>spring-modulith-bom</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Liquibase</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">4.33.0</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Pinned via <code>ext['liquibase.version']</code>, overriding the Boot BOM. The pin is deliberate: 4.33.0 is the newest Liquibase release under an Apache Category A license, so do not let the BOM manage the version.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">OpenAPI Generator</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">7.13.0</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Gradle plugin <code>org.openapi.generator</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">PostgreSQL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">18 (server)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>postgres:18-alpine</code> in compose; JDBC driver <code>org.postgresql:postgresql</code> at runtime.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Valkey</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">8</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>valkey/valkey:8-alpine</code> in compose; accessed through Spring&#8217;s Redis client stack (Valkey speaks the Redis wire protocol).</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_backend_dependencies">Backend dependencies</h4>
<div class="paragraph">
<p>One line per dependency, as declared in <code>consumer/build.gradle</code>.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Dependency</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-web</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring MVC REST controllers.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-security</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Authentication and authorization framework; all endpoints are deny-by-default.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-oauth2-resource-server</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Validates the BFF&#8217;s own JWTs (JSON Web Tokens, signed bearer tokens) on incoming requests.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-oauth2-authorization-server</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Runs an in-process OAuth2 authorization server for the open banking consent flow (authorization code with PKCE for third-party providers).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-data-jpa</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">JPA (Java Persistence API) entity mapping and Spring Data repositories over PostgreSQL.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-liquibase</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Liquibase runs versioned database migrations (changelogs under <code>src/main/resources/db/changelog/</code>) at startup. No <code>ddl-auto=update</code>; the schema is migration-owned and Hibernate only validates it.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-data-redis</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Redis-protocol client used against Valkey: JWT denylist, OTP state, rate-limit counters, ownership cache.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-validation</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Bean Validation annotations on request DTOs.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-mail</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SMTP delivery of OTP emails (Mailpit locally).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-actuator</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Health and operational endpoints. The compose healthcheck does not call Actuator; it is a raw TCP probe of the app port.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-cloud-starter-openfeign</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Feign, a declarative HTTP client: you write a Java interface, Spring generates the HTTP calls. Used for all Fineract Core calls.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-modulith-starter-core</code> / <code>-starter-jdbc</code> / <code>-core</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Spring Modulith module-boundary enforcement plus a JDBC-backed event publication log (transactional outbox for application events, completed rows deleted on success).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>springdoc-openapi-starter-webmvc-ui</code> 3.0.3</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Serves the BFF&#8217;s own OpenAPI spec at <code>/v3/api-docs</code>, which the client-generation tasks consume.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>caffeine</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">In-process cache, the L1 in front of Valkey for the ABAC ownership cache.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>lombok</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Compile-time code generation for getters, constructors, builders; the project uses Lombok-annotated classes instead of Java records. Spring Boot 4.0.x ships Jackson 3 (<code>tools.jackson.*</code>), with which Lombok&#8217;s <code>@Value</code>/<code>@Jacksonized</code> combination does not work, so the codebase standardizes on <code>@Getter</code> plus <code>@RequiredArgsConstructor</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>postgresql</code> (runtime)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">JDBC driver.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Test-scope dependencies:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Dependency</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-boot-starter-test</code>, JUnit 5</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Unit tests for services, policy logic, and mapping.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-security-test</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Security assertions for protected endpoints.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>spring-modulith-starter-test</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Verifies module boundaries.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>cucumber-java</code> 7.20.1</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">End-to-end tests written as Gherkin features in <code>src/test/resources/features/</code>, run by the <code>cucumber</code> Gradle task against the Docker stack.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>feign-okhttp</code>, <code>feign-jackson</code>, <code>feign-slf4j</code>, <code>jackson-databind-nullable</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Runtime pieces for the generated Java test client used by the Cucumber harness.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_openapi_client_generation_pipeline">OpenAPI client generation pipeline</h4>
<div class="paragraph">
<p>The BFF&#8217;s API contract is machine-generated in both directions.</p>
</div>
<div class="paragraph">
<p>Outbound (clients of the BFF), all in <code>consumer/build.gradle</code>:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Gradle task</th>
<th class="tableblock halign-left valign-top">What it does</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>openapi</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Downloads the live spec from the running app at <code><a href="http://localhost:8080/v3/api-docs" class="bare">http://localhost:8080/v3/api-docs</a></code> into <code>build/openapi/openapi.json</code>. The Docker stack must be up.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>generateJavaClient</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Generates a Java Feign client from that spec into <code>build/generated/java-client</code> (packages <code>org.apache.fineract.consumer.client.*</code>). This is the Cucumber test harness client.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>generateTypescriptClient</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Generates a typescript-angular client into <code>frontend/src/openapi-client</code> as npm package <code>@bff/client</code>. The Angular app imports only these typed services and models.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>generateClients</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Runs both of the above.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Inbound (the BFF&#8217;s client for Fineract): the <code>sanitizeFineractSpec</code> and <code>generateFineractClient</code> tasks generate the Fineract Feign client at every build from a vendored copy of Fineract&#8217;s OpenAPI spec. See Fineract Core Integration for the details.</p>
</div>
<div class="paragraph">
<p>Because the outbound spec is scraped from the running application, regenerating clients requires the compose stack. Old output directories must be deleted first, since the generator does not remove files for endpoints that no longer exist.</p>
</div>
</div>
<div class="sect3">
<h4 id="_frontend">Frontend</h4>
<div class="paragraph">
<p>The frontend is an Angular 22 client (standalone components, signals), built with Node 22 and served by <code>nginx:1.27-alpine</code> in its Docker image. Unit tests run with Vitest, end-to-end tests with Playwright. It consumes the generated <code>@bff/client</code> and contains no business logic.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_7">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>Generating both API clients from the BFF&#8217;s own OpenAPI spec makes the contract single-sourced: a controller change propagates to the Java test client and the Angular client mechanically, and drift shows up as a compile error rather than a runtime surprise.</p>
</li>
<li>
<p>Spring Modulith gives module-boundary enforcement without the operational cost of microservices; a boundary violation fails a test instead of surviving until a refactor.</p>
</li>
<li>
<p>Liquibase-owned schema plus <code>ddl-auto=validate</code> means the database is reproducible from changelogs alone, which the ephemeral <code>tmpfs</code> databases rely on.</p>
</li>
<li>
<p>Valkey with a Caffeine L1 keeps hot ABAC lookups in-process while remaining correct if the BFF is ever scaled beyond one instance.</p>
</li>
</ul>
</div>
</div>
</div>
</div>
`;export{e as default};