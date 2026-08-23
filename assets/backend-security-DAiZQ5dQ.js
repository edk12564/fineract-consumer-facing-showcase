var e=`
<h2 id="_security">Security</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This chapter describes the security model of the BFF. The BFF is the policy enforcement point for all consumer-facing rules. It authenticates users, mints and validates tokens, and authorizes every request before anything reaches Fineract Core. The sections in this chapter cover the token and session model, step-up authentication for sensitive actions, attribute-based access control, and how secrets and personal data are handled.</p>
</div>
<div class="sect2">
<h3 id="tokens">Token Model</h3>
<div class="paragraph">
<p>This section describes how the consumer BFF (backend-for-frontend, the Spring Boot service in <code>consumer/</code>) authenticates browser sessions. It covers the access token, the refresh token, device fingerprint binding, the claims carried in each token, signing key management, and request-time validation. Every value below is taken from the source tree, primarily <code>org.apache.fineract.consumer.infrastructure.jwt</code>, <code>infrastructure.configs</code>, <code>infrastructure.access</code>, and <code>authentication.command</code>.</p>
</div>
<div class="paragraph">
<p>A JWT (JSON Web Token) is a signed string containing a set of named fields called claims. The BFF issues its own JWTs and validates them itself; no external identity provider is involved.</p>
</div>
<div class="sect3">
<h4 id="_token_types_and_lifetimes">Token types and lifetimes</h4>
<div class="paragraph">
<p>All durations are configurable in <code>application.properties</code> through the <code>authentication.*</code> keys (Spring <code>Duration</code> shorthand, overridable by environment variable). The values below are the shipped defaults.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Token</th>
<th class="tableblock halign-left valign-top">Default TTL</th>
<th class="tableblock halign-left valign-top">Config key</th>
<th class="tableblock halign-left valign-top">Where it lives</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Access token (JWT)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">15 minutes</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>authentication.access-token-ttl</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">httpOnly cookie <code>access_token</code>, path <code>/api/v1</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">2FA challenge token (JWT)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">5 minutes</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>authentication.challenge-token-ttl</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Response body of <code>POST /api/v1/authentication/login</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Refresh token (opaque random value)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">1 day</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>authentication.refresh-token-ttl</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">httpOnly cookie <code>refresh_token</code>, path <code>/api/v1/authentication</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Rotation grace window</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">30 seconds</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>authentication.rotation-grace-ttl</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Not a token; see rotation below</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Step-up token (JWT)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">5 minutes</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>StepUpConstants.STEPUP_TTL</code> (code constant)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Response body; see Step-Up Authentication</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">One-time password (OTP)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">300 seconds</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>OtpConstants.OTP_TTL_SECONDS</code> (code constant)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">SHA-256 hash in Valkey</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The open banking surface has its own TTLs (<code>consumer.oauth2.access-token-ttl</code> default 5 minutes, <code>consumer.oauth2.refresh-token-ttl</code> default 90 days) issued by the in-process Spring Authorization Server. It shares the signing key and claim names described here but is otherwise out of scope for this section.</p>
</div>
</div>
<div class="sect3">
<h4 id="_login_pipeline">Login pipeline</h4>
<div class="paragraph">
<p>Constants referenced below live in <code>AuthenticationConstants</code> (<code>infrastructure.access.data</code>) and <code>ConsumerHeaders</code> (<code>infrastructure.web.data</code>).</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><code>POST /api/v1/authentication/login</code> with email and password, plus the <code>X-Device-Fingerprint</code> header. On a credential match the BFF creates an OTP (emailed to the user) and returns a challenge token: a JWT with claim <code>purpose</code> = <code>2fa_challenge</code> and the caller&#8217;s device fingerprint baked in. No session exists yet.</p>
</li>
<li>
<p><code>POST /api/v1/authentication/2fa</code> with the challenge token, the OTP, and the same <code>X-Device-Fingerprint</code> header. The BFF verifies the challenge token&#8217;s purpose and device fingerprint, validates the OTP, then establishes a session.</p>
</li>
<li>
<p>Establishing a session (<code>AuthenticationCommandServiceImpl.establishSession</code>) mints one access JWT and one refresh token and returns both as <code>Set-Cookie</code> headers. The JSON body contains only the access-token expiry timestamp, never a token value.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>Handled by <code>AuthenticationCommandController</code> (<code>authentication.command.api</code>) and <code>AuthenticationCommandServiceImpl</code> (<code>authentication.command.service</code>).</p>
</div>
</div>
<div class="sect3">
<h4 id="_access_token_delivery_httponly_cookie">Access token delivery: httpOnly cookie</h4>
<div class="paragraph">
<p>The access JWT is delivered exclusively as a cookie, not in a response body or <code>Authorization</code> header. An httpOnly cookie is a browser cookie that page JavaScript cannot read, which keeps the token out of reach of injected scripts.</p>
</div>
<div class="paragraph">
<p><code>AuthCookieFactory</code> (<code>infrastructure.access.service</code>) builds both cookies with:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>HttpOnly</code> set</p>
</li>
<li>
<p><code>SameSite=Strict</code> (the browser withholds the cookie on cross-site requests)</p>
</li>
<li>
<p><code>Secure</code> per <code>authentication.cookie-secure</code> (default <code>false</code> for the plain-HTTP dev compose stack; must be <code>true</code> wherever TLS terminates)</p>
</li>
<li>
<p>Path scoping: <code>access_token</code> to <code>/api/v1</code>, <code>refresh_token</code> to <code>/api/v1/authentication</code> only, so the refresh token is never sent to ordinary API endpoints</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>On the server side, <code>SecurityConfig</code> installs a custom bearer token resolver that reads the <code>access_token</code> cookie instead of the <code>Authorization</code> header. The resolver returns null on the public paths (login, 2FA, refresh, password forgot/reset, registration) so a stale cookie cannot break those requests.</p>
</div>
<div class="paragraph">
<p><code>POST /api/v1/authentication/logout</code> adds the access token&#8217;s <code>jti</code> to the denylist, revokes the presented refresh token, and returns expired copies of both cookies.</p>
</div>
</div>
<div class="sect3">
<h4 id="_refresh_tokens_storage_rotation_revocation">Refresh tokens: storage, rotation, revocation</h4>
<div class="paragraph">
<p>The refresh token is not a JWT. It is 32 bytes from <code>SecureRandom</code>, base64url encoded. The BFF never stores the raw value: the <code>refresh_tokens</code> table (entity <code>RefreshToken</code> in <code>authentication.command.domain</code>) stores only its SHA-256 hex hash, along with <code>user_id</code>, <code>device_fingerprint</code>, <code>issued_at</code>, <code>expires_at</code>, <code>revoked_at</code>, and <code>rotated_to</code>.</p>
</div>
<div class="paragraph">
<p>On <code>POST /api/v1/authentication/refresh</code>:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>The presented cookie value is hashed and looked up by <code>token_hash</code>. Unknown hash: rejected, audited as <code>token_unknown</code>.</p>
</li>
<li>
<p>If the row is unrotated, it must be unrevoked, unexpired, and its stored <code>device_fingerprint</code> must equal the <code>X-Device-Fingerprint</code> header. Any failure is rejected and audited with the specific reason (<code>revoked</code>, <code>expired</code>, <code>device_mismatch</code>).</p>
</li>
<li>
<p>A new access JWT and a new refresh token are minted. The old row is marked rotated: <code>rotated_to</code> points to the successor and <code>revoked_at</code> is set. Rotation happens on every successful refresh.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>Replay handling: if a token that has already been rotated is presented again, the BFF distinguishes an honest race from theft. Within <code>authentication.rotation-grace-ttl</code> (default 30 seconds) after rotation, with a matching device fingerprint and an unexpired row, the replay is treated as a concurrent-tab race and a fresh session is minted. Outside the grace window, on a device mismatch, or on an expired row, the BFF assumes the token was stolen, revokes every active refresh token for that user, audits <code>rotated_token_replayed</code>, and rejects the request.</p>
</div>
<div class="paragraph">
<p>Explicit revocation paths: logout revokes the presented token; password reset calls <code>revokeAllSessions</code>, which revokes all refresh-token rows for the user and adds a per-subject cutoff to the JWT denylist so already-issued access tokens die too. Password change calls <code>revokeAllSessionsAndReissue</code>, which performs the same revocation and then mints a fresh session for the caller.</p>
</div>
</div>
<div class="sect3">
<h4 id="_device_fingerprint_binding">Device fingerprint binding</h4>
<div class="paragraph">
<p>The client sends a device identifier in the <code>X-Device-Fingerprint</code> header (constant <code>ConsumerHeaders.DEVICE_FINGERPRINT</code>) on every request. The value is client generated; the BFF treats it as an opaque string of at most 100 characters.</p>
</div>
<div class="paragraph">
<p>The fingerprint is bound in three places:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Into each refresh-token row. A refresh attempt from a different fingerprint fails with <code>device_mismatch</code>, so a refresh token stolen from another device is unusable.</p>
</li>
<li>
<p>Into the access JWT as the <code>device_fingerprint</code> claim.</p>
</li>
<li>
<p>Into challenge and step-up tokens, which each carry the same claim.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p><code>DeviceFingerprintFilter</code> (<code>infrastructure.access.filter</code>) runs on every authenticated request and compares the header against the claim in the presented access token:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Condition</th>
<th class="tableblock halign-left valign-top">Result</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Header longer than 100 characters</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">400, code <code>error.msg.consumer.auth.device.fingerprint.invalid</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Header or claim missing or blank</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">401, code <code>error.msg.consumer.auth.device.fingerprint.mismatch</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Token lacks the <code>consumer:full</code> scope, or header does not equal the claim</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">403, code <code>error.msg.consumer.auth.device.fingerprint.forbidden</code>, plus a <code>DEVICE_FINGERPRINT_MISMATCH</code> audit event</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Because the access token is a <code>SameSite=Strict</code> cookie and every authenticated request must also carry a custom header that matches a claim inside that cookie, a cross-site attacker cannot forge a usable request. This combination is why the security chain runs with Spring&#8217;s CSRF filter disabled.</p>
</div>
</div>
<div class="sect3">
<h4 id="_jwt_claims">JWT claims</h4>
<div class="paragraph">
<p><code>JwtIssuer</code> (<code>infrastructure.jwt.service</code>) mints every session and single-purpose token. It always sets the registered claims and the caller supplies the custom ones. Claim name constants live in <code>JwtClaims</code> (<code>infrastructure.jwt.data</code>).</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Claim</th>
<th class="tableblock halign-left valign-top">Set on</th>
<th class="tableblock halign-left valign-top">Value</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>jti</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">All tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Random UUID; used by the logout denylist</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>iss</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">All tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>jwt.issuer</code> config (default <code><a href="http://localhost:8080" class="bare">http://localhost:8080</a></code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>sub</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">All tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The user&#8217;s public UUID (never the internal numeric ID)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>iat</code>, <code>exp</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">All tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Issue time and issue time plus TTL</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>tenant</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Access and open banking tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The Fineract tenant ID the session is bound to</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>kyc_verified</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Access and open banking tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Boolean; see the live-check rule below</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>scope</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Access and open banking tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>consumer:full</code> for browser sessions; <code>openbanking:*</code> scopes for third-party tokens</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>device_fingerprint</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Access, challenge, and step-up tokens</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The fingerprint bound at mint time</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>purpose</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Single-purpose tokens only</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>2fa_challenge</code>, <code>stepup</code>, or <code>openbanking</code>; its presence disqualifies a token as a consumer access token</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>action_fingerprint</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Step-up tokens only</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Hash of the approved action&#8217;s parameters; see Step-Up Authentication</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>There is no roles claim. Authorization decisions combine the <code>scope</code> claim, the <code>kyc_verified</code> claim, and attribute lookups performed by <code>AccessPolicyEvaluator</code> (<code>infrastructure.access.service</code>) against BFF state.</p>
</div>
<div class="sect4">
<h5 id="_the_kyc_verified_live_check_rule">The kyc_verified live-check rule</h5>
<div class="paragraph">
<p><code>kyc_verified</code> is never copied forward from a previous token. Every mint of a session token re-checks the user&#8217;s standing:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The consumer path: <code>establishSession</code> (called from 2FA verification, refresh, and post-password-change reissue) calls <code>ClientStandingChecker.isActive</code> (<code>infrastructure.kyc.service</code>) for any KYC-bound user before issuing anything. If the bound Fineract client is not in ACTIVE status (status ID 300), the mint aborts with <code>AuthenticationKycRevokedException</code> (403, <code>error.msg.consumer.authentication.kyc.revoked</code>).</p>
</li>
<li>
<p>The open banking path: <code>OAuth2AccessTokenCustomizer</code> (<code>infrastructure.oauth2.service</code>) performs the same check on authorization-code and refresh-token grants and fails the grant with <code>invalid_grant</code> if standing is lost.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The check is deliberately uncached: <code>ClientStandingChecker</code> calls the Fineract client API on every invocation. It fails closed: a 404 from Fineract yields <code>false</code>, and any other upstream error propagates and aborts the mint. A Fineract outage therefore blocks token issuance rather than issuing a token with stale KYC status.</p>
</div>
</div>
</div>
<div class="sect3">
<h4 id="_signing_key_management">Signing key management</h4>
<div class="paragraph">
<p>Tokens are signed with ES256 (ECDSA over the P-256 curve, an asymmetric scheme where the private key signs and the public key verifies). <code>JwtConfig</code> (<code>infrastructure.configs</code>) loads a single PEM file containing both the PKCS#8 private key and the public key, once at startup, from <code>jwt.key-location</code> (default <code>file:dev-jwt-key.pem</code>, override with <code>JWT_KEY_LOCATION</code>).</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Dev: the keypair is generated by <code>consumer/scripts/generate-dev-jwt-key.sh</code> and the file is gitignored. Startup fails with a pointer to that script if the file is missing or malformed.</p>
</li>
<li>
<p>Prod: the file is expected to be mounted from a secret manager.</p>
</li>
<li>
<p>The key ID is derived from the JWK thumbprint (<code>keyIDFromThumbprint</code>), so encoder and decoder agree without configuration.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The encoder holds the full keypair; the decoders are built from the public key only.</p>
</div>
</div>
<div class="sect3">
<h4 id="_request_time_validation">Request-time validation</h4>
<div class="paragraph">
<p>The consumer security chain (<code>SecurityConfig</code>, order <code>LOGIN_CHAIN_ORDER</code>) is a Spring Security OAuth2 resource server: a server that accepts a token on each request, validates it, and builds the security context from its claims, with no server-side HTTP session (<code>SessionCreationPolicy.STATELESS</code>). Everything not explicitly permitted (API docs, health, registration, and the public authentication POSTs) requires authentication; access is deny by default.</p>
</div>
<div class="paragraph">
<p>Each request passes through, in order:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>The cookie bearer token resolver extracts the JWT from the <code>access_token</code> cookie.</p>
</li>
<li>
<p><code>accessTokenJwtDecoder</code> (a dedicated <code>JwtDecoder</code> bean in <code>JwtConfig</code>) verifies the ES256 signature, expiry, and issuer, then applies two extra validators:</p>
<div class="ulist">
<ul>
<li>
<p>Reject any token carrying a <code>purpose</code> claim. Challenge, step-up, and open banking tokens can therefore never be used as consumer access tokens.</p>
</li>
<li>
<p>Reject denylisted tokens via <code>JwtDenylist</code> (<code>infrastructure.access.service</code>), a Valkey-backed store checked both per token ID (set at logout) and per subject cutoff (set by revoke-all flows). If Valkey is unreachable the check fails closed and the token is treated as denied.</p>
</li>
</ul>
</div>
</li>
<li>
<p><code>RateLimitFilter.perUser</code> enforces the per-user request budget.</p>
</li>
<li>
<p><code>DeviceFingerprintFilter</code> enforces the header-to-claim fingerprint match described above.</p>
</li>
<li>
<p>Endpoint code then runs ABAC checks through <code>AccessPolicyEvaluator</code> before delegating to Fineract.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>Open banking bearer tokens are validated by a separate resource chain (order <code>TPP_RESOURCE_CHAIN_ORDER</code>) and never pass this one.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_8">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>Cookies instead of header-carried tokens keep both tokens invisible to page JavaScript, so a cross-site scripting bug cannot exfiltrate them. The trade of losing header-based CSRF immunity is paid back with <code>SameSite=Strict</code> plus the mandatory custom fingerprint header.</p>
</li>
<li>
<p>Storing only the SHA-256 hash of refresh tokens means a database leak yields nothing directly replayable.</p>
</li>
<li>
<p>Rotation on every refresh plus replay detection converts a stolen refresh token into a detectable event: the legitimate client and the thief cannot both keep refreshing, and detection revokes the whole family. The 30-second grace window exists because real browsers race (two tabs refreshing simultaneously) and punishing that with full revocation made honest sessions flap.</p>
</li>
<li>
<p>Device binding is enforced at three layers (refresh row, JWT claim, per-request filter) so a token separated from its device fails at whichever layer it first touches.</p>
</li>
<li>
<p>Live KYC checking at every mint accepts one upstream round trip per token in exchange for a hard upper bound (one access-token TTL) on how long a de-activated client can keep transacting.</p>
</li>
<li>
<p>ES256 keeps tokens small and lets validation use only the public key, so components that verify never need signing material.</p>
</li>
<li>
<p>Single-purpose tokens share the issuer and validation machinery but are excluded from the access-token decoder by the <code>purpose</code> claim, avoiding a forked auth stack while preventing privilege crossover.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_6">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>There is no key rotation mechanism.</strong> One keypair is loaded at startup; there is no second-key overlap, no consumer-facing JWKS endpoint, and rotating the key invalidates every outstanding token. Prod rotation would need dual-key support in <code>JwtConfig</code>.</p>
</li>
<li>
<p><strong>The device fingerprint is a client-generated value.</strong> It is a UUID kept in browser localStorage. It proves continuity of a browser profile, not the identity of hardware, and an attacker who can read localStorage can clone it.</p>
</li>
<li>
<p><strong>Refresh rotation does not denylist old access tokens.</strong> Logout denylists the access token, but after a rotation the prior access token remains valid until its natural expiry (up to 15 minutes).</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="step-up">Step-Up Authentication</h3>
<div class="paragraph">
<p>Step-up authentication means re-proving your identity with a fresh factor immediately before a sensitive action, even though you already hold a valid session. A logged-in user can browse balances with only their access token, but moving money or changing credentials requires proving, right then, that they still control the second factor (an emailed one-time password) and the same device.</p>
</div>
<div class="paragraph">
<p>The mechanism lives in <code>org.apache.fineract.consumer.infrastructure.stepup</code>: <code>StepUpTokenService</code> (<code>service/</code>) and <code>StepUpConstants</code> (<code>data/</code>). It builds entirely on the JWT and OTP infrastructure described in Token Model; there is no separate step-up store.</p>
</div>
<div class="sect3">
<h4 id="_actions_that_require_step_up">Actions that require step-up</h4>
<div class="paragraph">
<p>Each protected action is a two-step endpoint pair: an initiate call that issues the challenge and a confirm call that must present the proof.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Action</th>
<th class="tableblock halign-left valign-top">Initiate</th>
<th class="tableblock halign-left valign-top">Confirm</th>
<th class="tableblock halign-left valign-top">Denial exception (all 401)</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Transfer execution</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/transfers/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/transfers/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransferStepUpInvalidException</code>, code <code>error.msg.consumer.transfers.command.stepup.invalid</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Add beneficiary</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/beneficiaries/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/beneficiaries/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiaryStepUpInvalidException</code>, code <code>error.msg.consumer.beneficiaries.command.stepup.invalid</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Update beneficiary</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>PUT /api/v1/beneficiaries/{publicId}/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>PUT /api/v1/beneficiaries/{publicId}/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiaryStepUpInvalidException</code>, code <code>error.msg.consumer.beneficiaries.command.stepup.invalid</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Password change (logged in)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/user/password/change/initiate</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>POST /api/v1/user/password/change/confirm</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserStepUpInvalidException</code>, code <code>error.msg.consumer.user.stepup.invalid</code></p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Beneficiary deletion (<code>DELETE /api/v1/beneficiaries/{publicId}</code>) and the logged-out password reset flow do not use step-up. Password reset relies on the emailed OTP alone, since there is no session to elevate.</p>
</div>
</div>
<div class="sect3">
<h4 id="_issuing_a_challenge">Issuing a challenge</h4>
<div class="paragraph">
<p>The initiate endpoint, running under a normal authenticated session, does three things (see <code>TransfersCommandServiceImpl.initiate</code> for the canonical example):</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>Runs the ABAC authorization for the action (<code>AccessPolicyEvaluator.authorize</code>), so a user who could never perform the action is refused before any challenge is created.</p>
</li>
<li>
<p>Creates an OTP through the shared <code>OtpService</code> (in <code>org.apache.fineract.consumer.infrastructure.otp</code>). This is the same OTP capability used by login 2FA and registration: a random code emailed to the user, stored only as a SHA-256 hash in Valkey with a 300-second TTL (<code>OtpConstants.OTP_TTL_SECONDS</code>) and a limit of 5 validation attempts (<code>OtpConstants.MAX_OTP_VALIDATION_ATTEMPTS</code>). One pending OTP exists per user at a time; issuing a new one replaces the previous one.</p>
</li>
<li>
<p>Computes an action fingerprint and mints a step-up token bound to it.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>The action fingerprint is a SHA-256 hex hash of a canonical string describing exactly what was approved. <code>StepUpTokenService.actionFingerprint</code> joins an action identifier and its parameters with <code>|</code>, for example endpoint, source account, destination account, destination type, and the amount normalized with <code>stripTrailingZeros</code>. Action identifiers in use: <code>/api/v1/transfers</code>, <code>beneficiaries:add</code>, <code>beneficiaries:update</code>, and <code>/api/v1/user/password/change</code>.</p>
</div>
<div class="paragraph">
<p><code>StepUpTokenService.issue</code> then mints a JWT through the shared <code>JwtIssuer</code> with:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Claim</th>
<th class="tableblock halign-left valign-top">Value</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>sub</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The user&#8217;s public UUID</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>purpose</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>stepup</code> (<code>StepUpConstants.STEPUP_PURPOSE_VALUE</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>device_fingerprint</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The caller&#8217;s <code>X-Device-Fingerprint</code> header value</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>action_fingerprint</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The hash described above</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>exp</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Issue time plus 5 minutes (<code>StepUpConstants.STEPUP_TTL</code>)</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The initiate response body returns the step-up token, its expiry, and the masked email the OTP was sent to. The token travels in the body, not a cookie, because it is a short-lived, single-action credential the client must explicitly present back.</p>
</div>
</div>
<div class="sect3">
<h4 id="_how_the_elevated_state_is_represented">How the elevated state is represented</h4>
<div class="paragraph">
<p>The elevated state is the step-up token itself. There is no claim added to the access token, no server-side session flag, and no cache entry recording "user X is elevated". The only server-side state involved is the pending OTP hash in Valkey. Elevation is therefore:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Stateless: possession of a valid step-up JWT plus the matching OTP is the entire proof.</p>
</li>
<li>
<p>Scoped to one action with one exact parameter set, via <code>action_fingerprint</code>.</p>
</li>
<li>
<p>Scoped to one device, via <code>device_fingerprint</code>.</p>
</li>
<li>
<p>Time-boxed to 5 minutes.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Because the token carries the <code>purpose</code> claim, the consumer resource server&#8217;s access-token decoder rejects it outright (see Token Model), so a step-up token can never be replayed as a session credential.</p>
</div>
</div>
<div class="sect3">
<h4 id="_verifying_at_confirm_time">Verifying at confirm time</h4>
<div class="paragraph">
<p>The confirm endpoint receives the step-up token, the OTP, and the action parameters again, and the service performs, in order:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>Recomputes the action fingerprint from the parameters actually submitted to confirm.</p>
</li>
<li>
<p>Calls <code>StepUpTokenService.verify</code>, which decodes the token with the primary <code>JwtDecoder</code> (signature, expiry, issuer) and requires all of: <code>purpose</code> equals <code>stepup</code>, <code>sub</code> equals the current session&#8217;s subject, <code>device_fingerprint</code> equals the header on the confirm request, and <code>action_fingerprint</code> equals the recomputed hash. Any decode failure or mismatch returns false; the caller throws the feature&#8217;s step-up exception.</p>
</li>
<li>
<p>Validates the OTP through <code>OtpService.validateOtp</code>. A successful validation deletes the pending OTP, so the OTP is single use even though the token is not.</p>
</li>
<li>
<p>Re-runs the ABAC authorization for the action, then executes it.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>If the client changes any parameter between initiate and confirm (a different amount, a different destination account), the recomputed fingerprint no longer matches the claim and verification fails. The user must start over, which regenerates both the OTP and the token.</p>
</div>
</div>
<div class="sect3">
<h4 id="_denial_behavior">Denial behavior</h4>
<div class="paragraph">
<p>All failure modes converge on the feature&#8217;s step-up exception, an <code>AbstractConsumerException</code> with HTTP status 401 and the machine-readable codes listed in the table above. The same exception covers a malformed or expired token, a subject, device, or action mismatch, and a wrong OTP, so a response does not reveal which check failed. After 5 wrong OTP attempts the pending OTP is deleted and the flow must be re-initiated; OTP expiry (300 seconds) or step-up token expiry (5 minutes) likewise force a fresh initiate. A failed confirm never touches the caller&#8217;s session: the access and refresh tokens remain valid, and only the step-up flow itself is rejected. Failed OTP validations are published as audit events by the OTP service.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_9">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>Reusing the OTP capability and <code>JwtIssuer</code> instead of a parallel mechanism keeps one hashing, delivery, TTL, and audit path for all one-time codes, and one signing key for all tokens.</p>
</li>
<li>
<p>Binding the token to a hash of the exact parameters turns "the user approved a transfer" into "the user approved this transfer", closing the gap where a confirm request could be tampered with after the challenge was solved.</p>
</li>
<li>
<p>Statelessness means no elevation table to expire or replicate; the guarantees are enforced by signature verification alone, which also works unchanged across multiple BFF replicas.</p>
</li>
<li>
<p>Requiring both the token and the OTP at confirm separates what the session holds (the token, obtainable by anyone with the session) from what only the real user holds (the code in their inbox).</p>
</li>
<li>
<p>Re-running the ABAC check at confirm, not just at initiate, means a permission revoked mid-challenge still blocks the action.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_7">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>The step-up token is not single use.</strong> Only the OTP is consumed. Within the 5-minute window a token could be verified more than once; in practice each confirm also demands the OTP, which is deleted on first success, so a full replay needs a fresh initiate. There is no denylist entry written for a consumed step-up token.</p>
</li>
<li>
<p><strong>Concurrent step-up flows clobber each other.</strong> One pending OTP per user means initiating a transfer challenge invalidates a pending beneficiary challenge&#8217;s OTP, and the login 2FA OTP shares the same slot.</p>
</li>
<li>
<p><strong>Email is the only OTP channel.</strong> An SMS delivery channel would be an addition to the OTP infrastructure package (<code>infrastructure.otp</code>).</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="abac">Attribute-Based Access Control (ABAC)</h3>
<div class="paragraph">
<p>This section describes how the consumer BFF (backend-for-frontend, the Spring Boot service in <code>consumer/</code>) decides whether a request is allowed.</p>
</div>
<div class="paragraph">
<p>ABAC (attribute-based access control) means authorization decisions are computed from attributes of the principal (who is asking), the resource (what they are asking about), and the environment (the circumstances of the request), rather than from role checks alone. A role check answers "is this user an admin". An ABAC check answers "is this KYC-verified consumer, on the device the session was issued to, asking about a savings account that actually belongs to them".</p>
</div>
<div class="sect3">
<h4 id="_deny_by_default">Deny by default</h4>
<div class="paragraph">
<p>Every HTTP request must pass authentication before any controller runs. There are three Spring Security filter chains, and each one ends in <code>anyRequest().authenticated()</code>:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>SecurityConfig.securityFilterChain</code> (in <code>infrastructure.configs.SecurityConfig</code>) covers the consumer API. A short explicit allowlist is <code>permitAll()</code>: the OpenAPI and Swagger UI paths, <code>/actuator/health</code>, <code>/api/v1/registration/**</code>, and five public <code>POST</code> endpoints (<code>/api/v1/authentication/login</code>, <code>/api/v1/authentication/2fa</code>, <code>/api/v1/authentication/refresh</code>, <code>/api/v1/user/password/forgot</code>, <code>/api/v1/user/password/reset</code>). Everything else requires a valid JWT (JSON Web Token, a signed token carrying claims about the session), which this chain reads from the <code>access_token</code> cookie rather than an <code>Authorization</code> header.</p>
</li>
<li>
<p><code>OAuth2AuthorizationServerConfig.authorizationServerSecurityFilterChain</code> covers the OAuth2 authorization server endpoints used by open banking third parties.</p>
</li>
<li>
<p><code>OAuth2AuthorizationServerConfig.openBankingResourceFilterChain</code> covers the open banking resource endpoints.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Note that the codebase does not use <code>@PreAuthorize</code> anywhere. Authentication is coarse-grained at the filter chain, and fine-grained authorization happens in the service layer through <code>AccessPolicyEvaluator</code> (next section). Deny-by-default is enforced twice:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>At the chain: an unauthenticated request to any non-allowlisted path is rejected before it reaches a controller.</p>
</li>
<li>
<p>At the policy table: <code>AccessPolicyEvaluator.authorize</code> looks the action up in a static policy table, and if no policy is registered for the action it throws <code>AccessPolicyMissingException</code> (HTTP 403, code <code>error.msg.consumer.access.denied</code>). A new endpoint whose action was never added to the table fails closed instead of silently passing.</p>
</li>
</ol>
</div>
</div>
<div class="sect3">
<h4 id="_policies_as_data_the_accesspolicyevaluator">Policies as data: the AccessPolicyEvaluator</h4>
<div class="paragraph">
<p>Policies are not <code>if</code> statements scattered through services. They are rows in a static, immutable table.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>ConsumerAction</code> (in <code>infrastructure.access.data</code>) is an enum of every authorizable action, for example <code>SAVINGS_VIEW</code>, <code>TRANSFER_EXECUTE</code>, <code>OPENBANKING_ACCOUNTS_VIEW</code>.</p>
</li>
<li>
<p><code>ActionPolicy</code> is the policy row: the action, the set of allowed token scopes, a <code>requiresKycVerified</code> flag, and an optional <code>ownership</code> field of type <code>ResourceType</code> (<code>SAVINGS</code> or <code>LOANS</code>).</p>
</li>
<li>
<p><code>ActionPolicies</code> holds the full table as an unmodifiable map, built with three factory helpers: <code>owned(&#8230;&#8203;)</code> (scope check, KYC required, ownership check), <code>unowned(&#8230;&#8203;)</code> (scope check, KYC required, no ownership), and <code>unownedKycNonrequired(&#8230;&#8203;)</code> (scope check only, used for actions such as <code>USER_PROFILE_VIEW</code> and <code>AUDIT_EVENT_SUBMIT</code> that must work before KYC binding completes).</p>
</li>
</ul>
</div>
<div class="paragraph">
<p><code>AccessPolicyEvaluator.authorize(jwt, action, resourceId, onDenied)</code> evaluates the row in a fixed order and fails closed at each step:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>Policy lookup. Missing policy throws <code>AccessPolicyMissingException</code>.</p>
</li>
<li>
<p>Scope. If the token&#8217;s <code>scope</code> claim shares no entry with the policy&#8217;s allowed scopes, it throws <code>AccessScopeInsufficientException</code> (403).</p>
</li>
<li>
<p>KYC. If the policy requires KYC and the <code>kyc_verified</code> claim is not <code>true</code>, it throws <code>AccessKycRequiredException</code> (403).</p>
</li>
<li>
<p>Ownership. If the policy names a <code>ResourceType</code> and the principal does not own the resource, it throws the caller-supplied exception, so each feature reports its own domain-specific denial (for example <code>SavingsQueryAccessDeniedException</code>).</p>
</li>
</ol>
</div>
<div class="paragraph">
<p>Every denial also publishes a <code>NonTransactionalAuditEvent</code> of type <code>ACCESS_DENIED</code> carrying the action name, the denial reason (<code>policy_missing</code>, <code>scope_insufficient</code>, <code>kyc_required</code>, or <code>ownership_denied</code>), the user&#8217;s public ID, and the resource ID when present.</p>
</div>
</div>
<div class="sect3">
<h4 id="_attribute_categories">Attribute categories</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Category</th>
<th class="tableblock halign-left valign-top">Attribute</th>
<th class="tableblock halign-left valign-top">Where it comes from</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Principal</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>scope</code> claim (<code>consumer:full</code>, <code>openbanking:accounts.read</code>, <code>openbanking:consents</code>, defined in <code>AuthenticationConstants</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Minted into the JWT at login or at open banking consent grant; checked against <code>ActionPolicy.allowedScopes</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Principal</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>kyc_verified</code> claim</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Set at every token mint after a live check of the bound Fineract client&#8217;s standing (<code>ClientStandingChecker.isActive</code>, which calls Fineract and requires client status ID 300, active). Checked against <code>ActionPolicy.requiresKycVerified</code>. The value is never carried forward from a previous token.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Principal</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>tenant</code> claim</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Minted into the JWT (constant in <code>JwtClaims</code>). Present in the token but not evaluated by <code>AccessPolicyEvaluator</code> (see Limitations).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Resource</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Account ownership (<code>ResourceType.SAVINGS</code>, <code>ResourceType.LOANS</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Resolved per request via <code>UserClientResolver</code> and <code>OwnedAccountsCache</code> (next section).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Environment</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Device fingerprint (<code>X-Device-Fingerprint</code> header versus the <code>device_fingerprint</code> claim)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Enforced by <code>DeviceFingerprintFilter</code> on every authenticated consumer request (below).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Environment</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Request rate per principal</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Enforced by <code>RateLimitFilter</code> (below).</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_example_a_feature_service_invoking_the_evaluator">Example: a feature service invoking the evaluator</h4>
<div class="paragraph">
<p>Feature services call the evaluator as the first statement of every service method, before any Fineract call. From <code>SavingsQueryServiceImpl</code>:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="java"><span class="nd">@Override</span>
<span class="kd">public</span> <span class="nc">SavingsAccountQueryData</span> <span class="nf">getAccount</span><span class="o">(</span><span class="nc">Jwt</span> <span class="n">jwt</span><span class="o">,</span> <span class="nc">Long</span> <span class="n">savingsId</span><span class="o">)</span> <span class="o">{</span>
    <span class="n">accessPolicyEvaluator</span><span class="o">.</span><span class="na">authorize</span><span class="o">(</span><span class="n">jwt</span><span class="o">,</span> <span class="nc">ConsumerAction</span><span class="o">.</span><span class="na">SAVINGS_VIEW</span><span class="o">,</span> <span class="n">savingsId</span><span class="o">,</span>
            <span class="nl">SavingsQueryAccessDeniedException:</span><span class="o">:</span><span class="k">new</span><span class="o">);</span>
    <span class="nc">SavingsAccountData</span> <span class="n">account</span> <span class="o">=</span> <span class="n">fetch</span><span class="o">(</span>
            <span class="o">()</span> <span class="o">-&gt;</span> <span class="n">savingsAccountApi</span><span class="o">.</span><span class="na">retrieveSavingsAccount</span><span class="o">(</span><span class="n">savingsId</span><span class="o">,</span> <span class="kc">null</span><span class="o">,</span> <span class="kc">null</span><span class="o">,</span> <span class="kc">null</span><span class="o">));</span>
    <span class="k">return</span> <span class="nf">toAccountData</span><span class="o">(</span><span class="n">account</span><span class="o">);</span>
<span class="o">}</span></code></pre>
</div>
</div>
<div class="paragraph">
<p>The same pattern appears in every feature service that touches protected state, including <code>LoansQueryServiceImpl</code>, <code>TransfersCommandServiceImpl</code>, <code>BeneficiariesCommandServiceImpl</code>, <code>SummaryQueryServiceImpl</code>, <code>AuditCommandServiceImpl</code>, and the open banking services.</p>
</div>
</div>
<div class="sect3">
<h4 id="_resource_ownership_checks">Resource ownership checks</h4>
<div class="paragraph">
<p>Before the BFF forwards a savings or loan query to Fineract, it confirms the logged-in consumer owns that account:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><code>UserClientResolver.resolveClientId(jwt)</code> takes the JWT subject (the user&#8217;s public UUID), looks the user up through <code>PrincipalUserLookupPort</code>, and returns the Fineract client ID bound to that user. An unknown subject throws <code>AccessUserNotFoundException</code>.</p>
</li>
<li>
<p><code>OwnedAccountsCache.ownedAccounts(clientId)</code> returns the set of savings and loan IDs the client owns. It is a two-level cache: an in-process Caffeine cache with a 60 second TTL (L1), then a shared Valkey entry under <code>abac:ownership:&lt;clientId&gt;</code> with a 300 second TTL (L2), and finally a live call to Fineract&#8217;s <code>ClientApi.retrieveAllClientAccounts</code>. Cache read or write failures fall through to Fineract; they never grant access.</p>
</li>
<li>
<p><code>AccessPolicyEvaluator.ownsResource</code> checks that the requested ID is in the owned set. A <code>null</code> resource ID is denied.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p><code>OwnedAccountsCache.evict(clientId)</code> invalidates both levels when ownership changes.</p>
</div>
</div>
<div class="sect3">
<h4 id="_why_the_bff_does_not_rely_on_fineracts_authorization_alone">Why the BFF does not rely on Fineract&#8217;s authorization alone</h4>
<div class="paragraph">
<p>The BFF authenticates to Fineract with a single service account: <code>FineractBasicAuthInterceptor</code> attaches the same basic-auth credentials to every outbound Feign call, and <code>FineractTenantHeaderInterceptor</code> attaches the tenant header. Fineract therefore sees one privileged caller and has no notion of which end consumer is behind a request. If the BFF forwarded a savings ID without checking ownership, Fineract would happily return another customer&#8217;s account. The BFF is the policy enforcement point for all consumer-facing rules; this is the reason the project exists, since upstream no longer ships the deprecated Fineract self-service APIs that allowed direct client access.</p>
</div>
</div>
<div class="sect3">
<h4 id="_rate_limiting_as_an_environment_control">Rate limiting as an environment control</h4>
<div class="paragraph">
<p><code>RateLimitFilter</code> (in <code>infrastructure.access.filter</code>) is a servlet filter built through two named factories, each installed on a different chain:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>RateLimitFilter.perUser</code> runs on the consumer chain, immediately after <code>BearerTokenAuthenticationFilter</code>, so the JWT subject is already resolved. The bucket key is the authenticated user&#8217;s public ID; unauthenticated requests pass through unlimited. The ceiling is <code>consumer.rate-limit.per-user-per-minute</code> (default 300).</p>
</li>
<li>
<p><code>RateLimitFilter.perTppClient</code> runs on the OAuth2 authorization server chain and applies only to <code>POST</code> requests to the token endpoint. The bucket key is the third-party client ID, taken from the basic-auth header or the <code>client_id</code> parameter, prefixed <code>tppclient:</code>. The ceiling is <code>consumer.rate-limit.per-tpp-client-per-minute</code> (default 60).</p>
</li>
</ul>
</div>
<div class="paragraph">
<p><code>RateLimitCounter</code> implements a fixed 60 second window in Valkey (<code>INCR</code> on <code>ratelimit:&lt;key&gt;</code> plus a TTL). When the count exceeds the ceiling the filter responds with HTTP 429, a <code>Retry-After</code> header, and the standard <code>ConsumerApiError</code> body (<code>error.msg.consumer.rate.limit.exceeded</code>). If Valkey is unreachable the counter logs an error and fails open, allowing the request. The whole feature is gated by <code>consumer.rate-limit.enabled</code>.</p>
</div>
<div class="paragraph">
<p>Per-IP rate limiting is deliberately not implemented in the BFF. Requests reach the BFF through a reverse proxy, where the client IP is only trustworthy at the edge; per-IP throttling is left to an upstream edge service.</p>
</div>
</div>
<div class="sect3">
<h4 id="_device_fingerprint_as_an_environment_control">Device fingerprint as an environment control</h4>
<div class="paragraph">
<p><code>DeviceFingerprintFilter</code> runs after the rate limit filter on the consumer chain. For every authenticated request it compares the <code>X-Device-Fingerprint</code> header (constant in <code>ConsumerHeaders</code>) with the <code>device_fingerprint</code> claim minted into the JWT at login. A missing header or missing claim yields HTTP 401; a mismatch, or a token without the <code>consumer:full</code> scope presenting a fingerprint, yields HTTP 403 and publishes a <code>DEVICE_FINGERPRINT_MISMATCH</code> audit event. This binds the session to the device it was issued to, so a stolen cookie replayed from another device fails.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_10">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>Policies live in one static table (<code>ActionPolicies</code>) instead of scattered conditionals, so the full authorization surface can be reviewed in a single file and a missing entry fails closed.</p>
</li>
<li>
<p>The evaluator is invoked from service methods rather than annotations because the ownership check needs the resource ID, which is method input, and because each feature supplies its own denial exception with a stable error code.</p>
</li>
<li>
<p><code>kyc_verified</code> is re-derived at every token mint from a live Fineract call (<code>ClientStandingChecker</code>, uncached) rather than copied from the previous token, so a client closed or blocked in Fineract loses access at the next mint.</p>
</li>
<li>
<p>Ownership data is cached (60s in-process, 300s shared) because it is consulted on every account-scoped request, but all cache failures degrade to a live Fineract call, never to an allow.</p>
</li>
<li>
<p>Rate limit state and the ownership cache live in Valkey so limits hold across BFF replicas.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_8">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong>ABAC enforcement relies on developer discipline.</strong> Every new service method that touches protected state must call <code>AccessPolicyEvaluator.authorize</code> as its first statement. There is no <code>@PreAuthorize</code> or method-security backstop, so a method that omits the call is protected only by chain-level authentication, not by scope, KYC, or ownership checks. The <code>AccessPolicyMissingException</code> safety net only fires for actions that do call the evaluator.</p>
</li>
<li>
<p><strong>The <code>tenant</code> claim is minted but never evaluated.</strong> No policy decision reads it.</p>
</li>
<li>
<p><strong>Environment signals are minimal.</strong> They are limited to device fingerprint and request rate. There is no geo signal, client-version check, or graded device-trust level, so no policy can require elevated trust for sensitive actions beyond the separate step-up token mechanism.</p>
</li>
<li>
<p><strong>The rate limiter fails open when Valkey is down.</strong> It also uses a fixed window, which permits short bursts of up to twice the ceiling across a window boundary.</p>
</li>
<li>
<p><strong>Cached ownership answers can be stale.</strong> They can lag by up to the cache TTLs (60s L1, 300s L2) after an account changes hands, except where code explicitly calls <code>evict</code>.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_secrets_and_personal_data_handling">Secrets and Personal Data Handling</h3>
<div class="paragraph">
<p>This section describes how the consumer BFF handles government ID numbers, one-time passwords, and personal data in audit events.</p>
</div>
<div class="paragraph">
<p>Two terms used throughout:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>PII (personally identifiable information): data that identifies a person, such as an email address, SSN, or Aadhaar number.</p>
</li>
<li>
<p>JPA <code>AttributeConverter</code>: a JPA hook that transforms an entity field on its way to and from a database column, commonly used to encrypt a value at rest. A KMS (key management service) is an external service that holds encryption keys and performs key operations, so keys never sit next to the data they protect.</p>
</li>
</ul>
</div>
<div class="sect3">
<h4 id="_government_id_numbers_ssn_aadhaar">Government ID numbers (SSN, Aadhaar)</h4>
<div class="paragraph">
<p>ID numbers are treated as secrets, and the strongest control is that the BFF never stores them at all.</p>
</div>
<div class="paragraph">
<p>Registration performs account binding, not first-time KYC: the person signing up proves they match a client record that already exists in Fineract. <code>IdentityQueryServiceImpl</code> (in <code>consumer.identity.query.service</code>) fetches the client&#8217;s identifiers from Fineract through the generated <code>ClientIdentifierApi</code>, normalizes both sides (trim, strip dashes and spaces, uppercase), and compares in memory. The result is an <code>IdentityVerificationQueryData</code> value object that can only be constructed through two named factories:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="java"><span class="kd">public</span> <span class="kd">static</span> <span class="nc">IdentityVerificationQueryData</span> <span class="nf">denied</span><span class="o">()</span> <span class="o">{</span>
    <span class="k">return</span> <span class="k">new</span> <span class="nf">IdentityVerificationQueryData</span><span class="o">(</span><span class="kc">false</span><span class="o">,</span> <span class="kc">null</span><span class="o">);</span>
<span class="o">}</span>

<span class="kd">public</span> <span class="kd">static</span> <span class="nc">IdentityVerificationQueryData</span> <span class="nf">verified</span><span class="o">(</span><span class="nc">String</span> <span class="n">maskedLastFour</span><span class="o">)</span> <span class="o">{</span>
    <span class="k">return</span> <span class="k">new</span> <span class="nf">IdentityVerificationQueryData</span><span class="o">(</span><span class="kc">true</span><span class="o">,</span> <span class="n">maskedLastFour</span><span class="o">);</span>
<span class="o">}</span></code></pre>
</div>
</div>
<div class="paragraph">
<p>So an API response can only ever carry <code>verified</code> true or false plus the last four characters of the matched identifier. The raw number is never echoed back.</p>
</div>
<div class="paragraph">
<p>Controls on the raw value during the brief in-memory window:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Not persisted. The <code>User</code> entity (<code>consumer.user.command.domain.User</code>) stores only <code>publicId</code>, <code>email</code>, <code>passwordHash</code>, <code>fineractClientId</code>, <code>status</code>, and timestamps. No column holds an ID number, so there is nothing to encrypt at rest.</p>
</li>
<li>
<p>Not logged. The request DTO that carries the raw ID, <code>SubmitRegistrationCommandRequest</code>, is annotated <code>@ToString(onlyExplicitlyIncluded = true)</code>, so an accidental <code>toString()</code> in a filter or exception handler emits nothing. Centralized exception handlers in <code>consumer.infrastructure.exception</code> return only the exception&#8217;s stable code and safe default message, never the request body.</p>
</li>
<li>
<p>Masked in responses. The registration command result (<code>SubmitRegistrationCommandData</code>) carries <code>maskedLastFour</code>, computed by <code>IdentityQueryServiceImpl.lastFour</code> from the normalized value.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_one_time_passwords_otp">One-time passwords (OTP)</h4>
<div class="paragraph">
<p>OTPs are the second authentication factor for login, registration email verification, and step-up flows. The implementation lives in <code>consumer.infrastructure.otp</code>.</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Generation: <code>OtpServiceImpl</code> draws a 6-character token from a 36-character alphabet (digits and uppercase letters) using <code>SecureRandom</code>.</p>
</li>
<li>
<p>Hashed at rest: only a SHA-256 hex digest of the uppercased token is stored (<code>hashToken</code> in <code>OtpServiceImpl</code>). The raw token exists in memory and in the delivery email; it is never written to the database or to Valkey. Because the code space is small, the short TTL and the attempt cap, not the hash strength, are the operative brute-force controls.</p>
</li>
<li>
<p>Short TTL: <code>OtpRepository</code> stores the hash in Valkey under <code>otp:pending:&lt;userPublicId&gt;</code> with a TTL of <code>OtpConstants.OTP_TTL_SECONDS</code> (300 seconds). Expiry deletes the challenge automatically.</p>
</li>
<li>
<p>Attempt-limited: each failed validation increments <code>otp:attempts:&lt;userPublicId&gt;</code> (same TTL). After <code>OtpConstants.MAX_OTP_VALIDATION_ATTEMPTS</code> (5) failures the pending OTP is deleted, so the code cannot be brute-forced within its lifetime. A successful validation consumes the OTP immediately.</p>
</li>
<li>
<p>Never logged: <code>OtpServiceImpl</code> and <code>OtpEmailDeliveryService</code> contain no log statement that touches the token. The audit events published around the OTP lifecycle (<code>OTP_CHALLENGE_ISSUED</code>, <code>OTP_VALIDATION_FAILED</code>, <code>OTP_ATTEMPTS_EXCEEDED</code>) carry only the user&#8217;s public ID.</p>
</li>
<li>
<p>Not echoed in errors: validation failures throw <code>OtpTokenInvalidException</code> (or a caller-supplied exception), whose response body contains only the error code and a generic message.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_pii_screening_in_the_audit_pipeline">PII screening in the audit pipeline</h4>
<div class="paragraph">
<p>The frontend batches client-side audit events to <code>POST</code> on the audit endpoint. The BFF does not trust that the client already scrubbed them. <code>AuditCommandServiceImpl.submitEvents</code> (in <code>consumer.audit.command.service</code>):</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p>Authorizes the caller through the ABAC evaluator (<code>ConsumerAction.AUDIT_EVENT_SUBMIT</code>).</p>
</li>
<li>
<p>Rejects batches larger than <code>consumer.audit.max-batch-size</code> (default 50) with <code>AuditBatchTooLargeException</code>.</p>
</li>
<li>
<p>Serializes each event&#8217;s <code>details</code> map and drops the event if it exceeds <code>consumer.audit.max-details-bytes</code> (default 2048) or if <code>AuditPiiScreen.containsPii</code> matches.</p>
</li>
</ol>
</div>
<div class="paragraph">
<p><code>AuditPiiScreen</code> is a regex blocklist over the serialized JSON:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>email addresses,</p>
</li>
<li>
<p>9-digit runs (SSN-like),</p>
</li>
<li>
<p>12-digit runs (Aadhaar-like),</p>
</li>
<li>
<p>13 to 19 digit runs (card-number-like),</p>
</li>
<li>
<p>JSON keys named <code>password</code>, <code>otp</code>, <code>ssn</code>, or <code>token</code> (case-insensitive).</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>An event that trips the screen is silently discarded and counted in the <code>rejected</code> total of the response; its contents are not logged.</p>
</div>
<div class="paragraph">
<p>The BFF also never trusts client timestamps as authoritative. The <code>AuditEvent</code> entity stores the client-supplied time in <code>occurred_at_claimed</code> and always records its own <code>received_at = Instant.now()</code> at persistence time. Client events are further constrained to event types marked client-submittable (<code>AuditEventType.isClientSubmittable</code>), deduplicated by a unique <code>event_uuid</code> constraint, and tagged with <code>source = CLIENT</code> to keep them distinguishable from server-observed facts.</p>
</div>
</div>
<div class="sect3">
<h4 id="_audit_log_versus_application_log">Audit log versus application log</h4>
<div class="paragraph">
<p>The BFF keeps two distinct records:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The structured audit log is the <code>audit_events</code> table in the BFF&#8217;s own Postgres database, with the event <code>details</code> stored as <code>jsonb</code>. Server-side security events (login success and failure, OTP lifecycle, access denials, device fingerprint mismatches, consent activity) are published in code as <code>TransactionalAuditEvent</code> (persisted after the surrounding transaction commits) or <code>NonTransactionalAuditEvent</code> (persisted immediately and asynchronously) and written by <code>ServerAuditEventListener</code>. Rows are immutable (<code>updatable = false</code> on every column). <code>AuditRetentionJob</code> applies the retention windows (server events 365 days, client events 30 days) when purging is switched on via <code>consumer.audit.purge-enabled</code>, which defaults to <code>false</code>.</p>
</li>
<li>
<p>The application log is ordinary SLF4J logging for operational diagnostics: cache misses, Valkey failures, rejected audit rows. It is not the audit trail and must never carry secrets.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Safe to log: public UUIDs (user public ID, event UUID), Fineract client IDs, action names, denial reasons, event types. Never logged: raw ID numbers, OTP tokens, passwords (only bcrypt-style hashes are stored, via <code>PasswordEncoderConfig</code>), third-party client secrets (the <code>registered_tpps</code> table stores only a bcrypt hash in <code>client_secret_hash</code>; TPP rows are onboarded out-of-band and the raw secret is never persisted), full request bodies, or audit event <code>details</code> payloads. In production, TPPs must be verified and onboarded by an external open banking service before their <code>registered_tpps</code> rows are inserted.</p>
</div>
</div>
<div class="sect3">
<h4 id="_design_rationale_11">Design rationale</h4>
<div class="ulist">
<ul>
<li>
<p>Not storing government IDs at all is a stronger control than encrypting them: there is no ciphertext to steal, no key to rotate, and no decryption path to audit. The BFF holds the raw value only for the duration of one in-memory comparison against Fineract. If a future feature does store an ID number, it uses envelope encryption via a JPA <code>AttributeConverter</code> with keys held in a KMS.</p>
</li>
<li>
<p>Constrained construction (<code>denied()</code> / <code>verified(maskedLastFour)</code>) makes the impossible state "not verified but carrying digits" unrepresentable, so masking cannot be forgotten at a call site.</p>
</li>
<li>
<p>Hashing OTPs instead of storing them plain means a Valkey compromise does not directly disclose live codes, and the 300 second TTL plus 5-attempt cap bound both the online and offline attack windows.</p>
</li>
<li>
<p>Server-side PII screening exists because client-side scrubbing runs in an environment the attacker controls; the BFF re-validates every audit payload.</p>
</li>
<li>
<p>Recording <code>received_at</code> alongside <code>occurred_at_claimed</code> preserves the client&#8217;s claim for UX ordering while keeping a server-controlled timestamp for forensic purposes.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_limitations_and_future_work_9">Limitations and future work</h4>
<div class="ulist">
<ul>
<li>
<p><strong><code>AuditPiiScreen</code> is a blocklist, not an allowlist.</strong> As a regex blocklist it misses formatted variants it does not model and false-positives on any innocent 9-digit number, silently dropping the event. Rejected events are only visible as a count in the response, which makes screening problems hard to diagnose.</p>
</li>
<li>
<p><strong>Application logs are plain Spring Boot console logs.</strong> No structured JSON logging or log-shipping configuration exists in the module yet, so the "safe to log" discipline relies on code review rather than tooling.</p>
</li>
</ul>
</div>
</div>
</div>
</div>
`;export{e as default};