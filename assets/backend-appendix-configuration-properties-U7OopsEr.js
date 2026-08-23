var e=`
<h2 id="_appendix_configuration_properties">Configuration Properties</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This appendix lists every configuration property the BFF reads, grouped by subsystem. All properties are defined in <code>consumer/src/main/resources/application.properties</code>; values shown in the Default Value column are the shipped defaults, which are tuned for the local Docker Compose stack, not for production.</p>
</div>
<div class="paragraph">
<p>Where a property is declared with an explicit <code>\${ENV_VAR:default}</code> placeholder, the Env Variable column names that variable. Properties without an explicit placeholder show <code>-</code>, but every property can still be overridden through Spring Boot&#8217;s standard relaxed environment-variable binding (for example <code>CONSUMER_AUDIT_QUERY_ENABLED</code> overrides <code>consumer.audit.query-enabled</code>, as the local compose stack does). Secret-bearing properties never show their value here; dev-stack values live in <code>consumer/compose.yaml</code> or in the placeholder fallbacks in <code>application.properties</code>.</p>
</div>
<div class="sect2">
<h3 id="_server_properties">Server Properties</h3>
<div class="paragraph">
<p>General application and web-server settings. The HTTP port is Spring Boot&#8217;s default <code>8080</code> (not overridden in configuration); the compose stack maps it to host port 8080.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 2. Server Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.application.name</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Logical name of the Spring Boot application, used in logs and framework metadata.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">server.forward-headers-strategy</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">framework</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Makes the BFF honor <code>X-Forwarded-*</code> headers set by a fronting reverse proxy (nginx in the e2e stack), so generated URLs and secure cookies reflect the external HTTPS address.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.modulith.detection-strategy</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">org.apache.fineract.consumer.ConsumerModuleDetectionStrategy</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Registers the custom Spring Modulith strategy that defines module boundaries and which packages each feature module exposes.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.modulith.events.jdbc.schema-initialization.enabled</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">false</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Stops Spring Modulith from creating its event-publication (outbox) table itself; the schema is owned by Liquibase instead.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.modulith.events.completion-mode</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">delete</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Deletes outbox event rows once their listeners complete, instead of keeping completed rows forever.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_database_properties">Database Properties</h3>
<div class="paragraph">
<p>Connection settings for the BFF&#8217;s own PostgreSQL database (<code>bff-db</code> in the compose stack). All schema changes ship as Liquibase changelogs under <code>consumer/src/main/resources/db/changelog/</code>; Liquibase runs automatically at startup with Spring Boot&#8217;s default settings, so it has no dedicated properties here.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 3. Database Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.datasource.url</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_DATASOURCE_URL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">jdbc:postgresql://localhost:5432/consumerapp</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">JDBC URL of the BFF&#8217;s PostgreSQL database.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.datasource.username</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_DATASOURCE_USERNAME</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumerapp</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Database login user for the BFF.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.datasource.password</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_DATASOURCE_PASSWORD</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">(secret; dev default in compose.yaml)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Database login password for the BFF.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.jpa.hibernate.ddl-auto</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">validate</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Hibernate only validates that the existing schema matches the JPA entities at startup; it never creates or alters tables; that is Liquibase&#8217;s job.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_cache_properties">Cache Properties</h3>
<div class="paragraph">
<p>Connection settings for Valkey (a Redis-compatible key-value store, hence the <code>spring.data.redis.*</code> namespace). The BFF uses it for the JWT logout denylist, pending OTP hashes, rate-limit counters, and the shared layer of the ABAC ownership cache. No authentication is configured in the dev stack; production deployments enable Valkey authentication plus TLS or network isolation through the corresponding <code>spring.data.redis.*</code> properties.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 4. Cache Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.data.redis.host</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_DATA_REDIS_HOST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">localhost</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Hostname of the Valkey server.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.data.redis.port</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_DATA_REDIS_PORT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">6379</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Port of the Valkey server.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_fineract_client_properties">Fineract Client Properties</h3>
<div class="paragraph">
<p>Settings for the BFF&#8217;s service account against upstream Fineract Core, bound by <code>FineractClientProperties</code> (<code>fineract.client.*</code>). The BFF is the only component that talks to Fineract; every Feign call carries these credentials and the tenant header.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 5. Fineract Client Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">fineract.client.base-url</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">FINERACT_BASE_URL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><a href="http://localhost:8888/fineract-provider/api" class="bare">http://localhost:8888/fineract-provider/api</a></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Base URL of the Fineract Core API the BFF calls. Inside the compose network this is overridden to <code><a href="http://fineract:8080/fineract-provider/api" class="bare">http://fineract:8080/fineract-provider/api</a></code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">fineract.client.username</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">FINERACT_SERVICE_USERNAME</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">mifos</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fineract service-account username used for basic authentication on every upstream call (dev default; use a dedicated service account in production).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">fineract.client.password</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">FINERACT_SERVICE_PASSWORD</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">(secret; dev default is the placeholder fallback in <code>application.properties</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fineract service-account password.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">fineract.client.tenant-id</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">FINERACT_SERVICE_TENANT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">default</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fineract tenant identifier sent on every upstream request (Fineract is multi-tenant; this selects which tenant database serves the call).</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_authentication_properties">Authentication Properties</h3>
<div class="paragraph">
<p>Session and token settings for consumer login, bound by <code>JwtProperties</code> (<code>jwt.*</code>) and <code>AuthenticationProperties</code> (<code>authentication.*</code>). Durations use Spring&#8217;s shorthand (<code>15m</code>, <code>1d</code>, <code>30s</code>). The step-up token lifetime (5 minutes) is a code constant in <code>StepUpConstants</code>, not a configurable property.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 6. Authentication Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">jwt.key-location</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">JWT_KEY_LOCATION</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">file:dev-jwt-key.pem</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Location of the ES256 keypair PEM file (PKCS#8 private key + public key) used to sign and verify the BFF&#8217;s own JWTs, read once at startup. Dev key is generated by <code>scripts/generate-dev-jwt-key.sh</code>; production mounts one from a secret manager.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">jwt.issuer</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">JWT_ISSUER</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><a href="http://localhost:8080" class="bare">http://localhost:8080</a></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Value of the <code>iss</code> claim stamped into every JWT the BFF mints, and checked when validating.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">authentication.access-token-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">AUTH_ACCESS_TOKEN_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">15m</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Lifetime of the short-lived access JWT that authenticates API requests.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">authentication.challenge-token-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">AUTH_CHALLENGE_TOKEN_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">5m</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Lifetime of the intermediate challenge token issued between password check and OTP verification during login.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">authentication.refresh-token-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">AUTH_REFRESH_TOKEN_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">1d</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Lifetime of the rotating refresh token (httpOnly cookie) used to mint new access tokens.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">authentication.rotation-grace-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">AUTH_ROTATION_GRACE_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">30s</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Window after a refresh-token rotation during which the just-replaced token is still accepted, so a race between concurrent browser tabs is not treated as token theft.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">authentication.cookie-secure</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">AUTH_COOKIE_SECURE</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">false</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Whether auth cookies carry the <code>Secure</code> flag (HTTPS-only). False in the plain-HTTP dev stack; set true wherever TLS terminates in front of the BFF.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_otp_and_mail_properties">OTP and Mail Properties</h3>
<div class="paragraph">
<p>Settings for delivering one-time passcodes (OTPs) by email. The dev stack points at Mailpit (a local SMTP catcher with a web inbox at <a href="http://localhost:8025" class="bare">http://localhost:8025</a>); production points at the institution&#8217;s SMTP relay. The OTP lifetime (300 seconds) and maximum validation attempts (5) are code constants in <code>OtpConstants</code>, not configurable properties.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 7. OTP and Mail Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.mail.host</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_MAIL_HOST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">localhost</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Hostname of the SMTP server used to send OTP emails.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">spring.mail.port</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SPRING_MAIL_PORT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">1025</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Port of the SMTP server.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">otp.email.from</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OTP_EMAIL_FROM</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><a href="mailto:no-reply@fineract-consumer.local">no-reply@fineract-consumer.local</a></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Sender address on outgoing OTP emails.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">otp.email.subject</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OTP_EMAIL_SUBJECT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Your verification code</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Subject line on outgoing OTP emails.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_rate_limit_properties">Rate Limit Properties</h3>
<div class="paragraph">
<p>Per-user request throttling, bound by <code>RateLimitProperties</code> (<code>consumer.rate-limit.*</code>) and enforced by the Valkey-backed <code>RateLimitFilter</code>. This covers per-authenticated-principal limits only; per-IP volumetric limiting is the job of an upstream edge service, not the BFF.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 8. Rate Limit Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.rate-limit.enabled</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">true</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Master switch for the rate-limit filters.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.rate-limit.per-user-per-minute</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">300</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Maximum requests per minute allowed for a single logged-in user (minimum value 1).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.rate-limit.per-tpp-client-per-minute</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">60</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Maximum requests per minute against the OAuth2 token endpoint for a single third-party-provider client id (minimum value 1).</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="properties-audit">Audit Properties</h3>
<div class="paragraph">
<p>Settings for the audit trail (<code>consumer.audit.*</code>). Both <code>retention-days</code> entries are required: startup fails if either is missing.</p>
</div>
<div class="paragraph">
<p>Retention works as follows. The purge job ships disabled; deployers must set <code>consumer.audit.purge-enabled=true</code> for the <code>retention-days</code> values to be enforced. Until then, audit rows accumulate without limit.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 9. Audit Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.retention-days.server</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">365</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">How many days server-emitted audit events are kept before the purge job deletes them.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.retention-days.client</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">30</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">How many days client-submitted (frontend) audit events are kept before the purge job deletes them.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.purge-cron</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>0 30 3 * * *</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Cron schedule for the retention purge job (default: daily at 03:30).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.purge-batch-size</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">1000</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Maximum number of expired audit rows deleted per purge batch, so the job never locks the table for long.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.purge-enabled</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">false</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Whether the scheduled purge job runs at all. Disabled by default; the retention windows above take effect only once this is <code>true</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.max-batch-size</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">50</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Maximum number of events the frontend may submit in one batched audit POST.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.max-details-bytes</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">2048</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Maximum serialized size of a single audit event&#8217;s details payload.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.audit.query-enabled</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">-</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">false</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Enables the demo-only audit read endpoint. Off by default; the local compose stack turns it on via <code>CONSUMER_AUDIT_QUERY_ENABLED</code>.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect2">
<h3 id="_open_banking_properties">Open Banking Properties</h3>
<div class="paragraph">
<p>Settings for the in-process OAuth2 authorization server that issues consent-scoped tokens to third-party providers (TPPs), bound by <code>OAuth2ConsumerProperties</code> (<code>consumer.oauth2.*</code>). Approved TPPs are not configured here; they live in the <code>registered_tpps</code> database table, so onboarding and revocation never need a redeploy.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<caption class="title">Table 10. Open Banking Properties</caption>
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Name</th>
<th class="tableblock halign-left valign-top">Env Variable</th>
<th class="tableblock halign-left valign-top">Default Value</th>
<th class="tableblock halign-left valign-top">Description</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.oauth2.access-token-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OB_ACCESS_TOKEN_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">5m</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Lifetime of an open-banking access token (deliberately shorter than the consumer session token).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.oauth2.refresh-token-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OB_REFRESH_TOKEN_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">90d</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Lifetime of an open-banking refresh token held by a TPP.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.oauth2.consent-ttl</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OB_CONSENT_TTL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">90d</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">How long a customer&#8217;s data-sharing consent remains valid before the TPP must obtain a fresh one.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.oauth2.frontend-base-url</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OB_FRONTEND_BASE_URL</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><a href="http://localhost:4443" class="bare">http://localhost:4443</a></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Base URL of the Angular frontend, used to build the consent-approval redirect during the authorization flow.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">consumer.oauth2.kid</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OB_JWT_KID</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">bff-es256</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Key id (<code>kid</code>) published in the JWKS document and stamped into open-banking token headers, so TPPs can pick the right verification key.</p></td>
</tr>
</tbody>
</table>
</div>
</div>
`;export{e as default};