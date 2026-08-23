var e=`
<h2 id="_api_reference">API Reference</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This section is the entry point to the BFF&#8217;s HTTP API. It explains how to produce the OpenAPI specification, where to browse it interactively, and how the generated clients are built from it, and it closes with a summarized index of every endpoint. OpenAPI is a machine-readable JSON description of an HTTP API that captures every path, parameter, and response schema in one file. The BFF&#8217;s spec is not written by hand: springdoc (a library that inspects the running Spring application) derives it from the controllers at runtime, so the spec always matches the code that is actually deployed.</p>
</div>
<div class="paragraph">
<p>For request and response schemas, use Swagger UI or the spec itself. This section deliberately stops at one line per endpoint.</p>
</div>
<div class="sect2">
<h3 id="_generating_the_openapi_spec">Generating the OpenAPI spec</h3>
<div class="paragraph">
<p>The <code>openapi</code> Gradle task scrapes the spec from the running application at <code><a href="http://localhost:8080/v3/api-docs" class="bare">http://localhost:8080/v3/api-docs</a></code> and writes it to <code>consumer/build/openapi/openapi.json</code>. Because the spec comes from the live application, the Docker stack must be up first. Run from <code>consumer/</code>:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="bash"><span class="nb">cd </span>consumer
docker compose up <span class="nt">-d</span> <span class="nt">--build</span> <span class="nt">--wait</span> <span class="o">&amp;&amp;</span> ./gradlew openapi<span class="p">;</span> docker compose down <span class="nt">-v</span></code></pre>
</div>
</div>
<div class="paragraph">
<p>Both databases keep their data on tmpfs (in-memory) mounts, so removing the containers on teardown is what gives the next run a clean database. The <code>-v</code> flag additionally removes any volumes created alongside the containers.</p>
</div>
</div>
<div class="sect2">
<h3 id="_browsing_swagger_ui">Browsing Swagger UI</h3>
<div class="paragraph">
<p>Swagger UI is a browser page that renders the OpenAPI spec as interactive documentation. You can expand each endpoint, see its schemas, and send test requests. The BFF serves it through springdoc&#8217;s default paths (no custom paths are configured), and <code>SecurityConfig</code> permits them without authentication. With the stack up, on the BFF&#8217;s host port 8080:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Swagger UI: <code><a href="http://localhost:8080/swagger-ui.html" class="bare">http://localhost:8080/swagger-ui.html</a></code> (redirects to <code>/swagger-ui/index.html</code>)</p>
</li>
<li>
<p>Raw spec, JSON: <code><a href="http://localhost:8080/v3/api-docs" class="bare">http://localhost:8080/v3/api-docs</a></code></p>
</li>
<li>
<p>Raw spec, YAML: <code><a href="http://localhost:8080/v3/api-docs.yaml" class="bare">http://localhost:8080/v3/api-docs.yaml</a></code></p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The spec&#8217;s title, version, and security scheme come from <code>OpenApiConfig</code> in <code>consumer.infrastructure.configs</code>. It declares the session cookie carrying the access token as the API-wide security scheme, so Swagger UI shows which endpoints expect an authenticated session.</p>
</div>
</div>
<div class="sect2">
<h3 id="_generated_clients">Generated clients</h3>
<div class="paragraph">
<p>Two clients are generated from <code>consumer/build/openapi/openapi.json</code>, keeping the BFF contract the single source of truth for both the test harness and the frontend:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>./gradlew generateJavaClient</code> produces a Java Feign client (Feign is a declarative HTTP client library) in <code>consumer/build/generated/java-client</code>. The Cucumber end-to-end test harness compiles against it.</p>
</li>
<li>
<p><code>./gradlew generateTypescriptClient</code> produces a TypeScript Angular client in <code>frontend/src/openapi-client</code>, imported by the frontend under the path alias <code>@bff/client</code>.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Always delete the old output directory first. The generator only adds and overwrites files, so services for endpoints that no longer exist would otherwise linger. Both directories are gitignored generated output, so nothing tracked by git is at risk. Run from <code>consumer/</code>:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="bash"><span class="nb">cd </span>consumer

<span class="c"># Java client (Cucumber test harness)</span>
<span class="nb">rm</span> <span class="nt">-rf</span> build/generated/java-client
docker compose up <span class="nt">-d</span> <span class="nt">--build</span> <span class="nt">--wait</span> <span class="o">&amp;&amp;</span> ./gradlew generateJavaClient<span class="p">;</span> docker compose down <span class="nt">-v</span>

<span class="c"># TypeScript client (Angular app)</span>
<span class="nb">rm</span> <span class="nt">-rf</span> ../frontend/src/openapi-client
docker compose up <span class="nt">-d</span> <span class="nt">--build</span> <span class="nt">--wait</span> <span class="o">&amp;&amp;</span> ./gradlew generateTypescriptClient<span class="p">;</span> docker compose down <span class="nt">-v</span>

<span class="c"># Both at once</span>
<span class="nb">rm</span> <span class="nt">-rf</span> build/generated/java-client ../frontend/src/openapi-client
docker compose up <span class="nt">-d</span> <span class="nt">--build</span> <span class="nt">--wait</span> <span class="o">&amp;&amp;</span> ./gradlew openapi generateClients<span class="p">;</span> docker compose down <span class="nt">-v</span></code></pre>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_endpoint_index">Endpoint index</h3>
<div class="paragraph">
<p>One row per endpoint, grouped by feature module. All paths sit under the <code>/api/v1</code> prefix and, unless noted, require an authenticated session. Authorization rules (attribute-based access control) are covered in the security chapter; schemas live in Swagger UI.</p>
</div>
<div class="sect3">
<h4 id="_registration_2">Registration</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/registration/submit</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit registration details and the government ID for account binding (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/registration/otp/send</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Send a one-time passcode (OTP) to the registrant&#8217;s email (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/registration/otp/verify</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Verify the OTP and activate the newly registered user (unauthenticated)</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_authentication_2">Authentication</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/authentication/login</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Check email and password; issues a two-factor OTP challenge (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/authentication/2fa</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Verify the OTP and establish the session (sets the auth cookies) (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/authentication/refresh</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Rotate the refresh token and mint a new access token (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/authentication/logout</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">End the session and revoke its tokens</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_user">User</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/password/change/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Start a password change; issues a step-up OTP challenge</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/password/change/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm the password change with the OTP</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/password/forgot</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Request a password-reset OTP for a forgotten password (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/password/reset</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Reset the password with the emailed OTP (unauthenticated)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/profile</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch the logged-in user&#8217;s profile</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/charges</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List charges levied on the user&#8217;s client record</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/image</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch the user&#8217;s profile picture (read-only)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/user/obligees</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List guarantee obligations (loans the user stands guarantor for)</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_summary">Summary</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/summary/accounts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Aggregated view of the user&#8217;s savings and loan accounts</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_savings_2">Savings</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/savings</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List the user&#8217;s savings accounts</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/savings/{savingsId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch one savings account with balance details</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/savings/{savingsId}/charges</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List charges on a savings account</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/savings/{savingsId}/transactions</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Search a savings account&#8217;s transactions (paginated, filterable)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/savings/{savingsId}/transactions/{transactionId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch one savings transaction</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/savings/template</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Reference data (products, currencies) for savings accounts</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_loans_2">Loans</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit a loan application</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">PUT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Modify a pending loan application</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Withdraw a pending loan application</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List the user&#8217;s loan accounts</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/schedule-preview</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Preview the repayment schedule for a prospective loan (read-only; POST carries the parameters)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch one loan with outstanding balance and schedule</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}/transactions</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List a loan&#8217;s transactions (paginated, filterable)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}/transactions/{transactionId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch one loan transaction</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}/charges</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List charges on a loan</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}/charges/{chargeId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Fetch one loan charge</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/{loanId}/guarantors</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List a loan&#8217;s guarantors</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/loans/template</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Reference data (products, terms) for loan applications</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_transfers">Transfers</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/transfers/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Start a transfer; issues a step-up OTP challenge</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/transfers/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm the transfer with the OTP and execute it</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/transfers</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List the user&#8217;s transfer history (paginated)</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_beneficiaries_2">Beneficiaries</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/beneficiaries/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Start adding a beneficiary; issues a step-up OTP challenge</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/beneficiaries/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm the addition with the OTP</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">PUT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/beneficiaries/{publicId}/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Start updating a beneficiary; issues a step-up OTP challenge</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">PUT</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/beneficiaries/{publicId}/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm the update with the OTP</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">DELETE</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/beneficiaries/{publicId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Delete a beneficiary</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/beneficiaries</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List the user&#8217;s beneficiaries</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_audit_3">Audit</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/audit/events</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Ingest a batch of client-side audit events from the frontend</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/audit/events</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List the caller&#8217;s own audit events, paginated (demo-only; registered only when <code>consumer.audit.query-enabled</code> is set, off by default)</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_open_banking">Open banking</h4>
<div class="paragraph">
<p>Endpoints for third-party providers (TPPs, licensed external applications a customer authorizes to read their data) plus the user-facing consent management surface. The four TPP rows do not use the session cookie: they authenticate with a consent-scoped OAuth2 bearer token, issued by the token endpoint below and validated by a dedicated resource-server filter chain. The two consent-management rows use the normal authenticated session.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Method</th>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/openbanking/account-access-consents</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">TPP creates an account-access consent request</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/openbanking/account-access-consents/{consentId}</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">TPP reads a consent&#8217;s status</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/openbanking/accounts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">TPP lists the accounts covered by the consent</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/openbanking/accounts/{accountId}/balances</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">TPP reads a consented account&#8217;s balances</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">GET</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/openbanking/consents</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Logged-in user lists their granted consents</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">POST</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/api/v1/openbanking/consents/{consentId}/revoke</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Logged-in user revokes a consent</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The OAuth2 protocol endpoints backing the TPP flow (<code>/api/v1/oauth2/authorize</code>, <code>/api/v1/oauth2/token</code>, <code>/api/v1/oauth2/jwks</code>, and <code>/api/v1/oauth2/revoke</code>) are provided by Spring Authorization Server rather than by BFF controllers. Their paths are configured in <code>OAuth2AuthorizationServerConfig</code>, and they do not appear in the OpenAPI spec because springdoc only documents controller endpoints.</p>
</div>
</div>
</div>
</div>
`;export{e as default};