var e=`
<h2 id="_features">Features</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This chapter documents the Angular client feature by feature. Each feature lives in its own folder under <code>frontend/src/app/features/</code>, mirroring a BFF bounded context. Most features follow the same shape: lazy-loaded route components, a signal-backed store that wraps the generated <code>@bff/client</code> services, and templates that only render state and dispatch actions. Three features deviate: authentication keeps its state in the core <code>AuthService</code>, registration wraps the generated client in a stateless service, and consent is a single component that posts native HTML forms to the BFF with no <code>@bff/client</code> call at all. Every section lists the screens and routes, walks through the interesting flows, and maps each user action to the generated client call. Each section also points to the matching BFF feature section for the server side.</p>
</div>
<div class="sect2">
<h3 id="_authentication">Authentication</h3>
<div class="sect3">
<h4 id="_purpose">Purpose</h4>
<div class="paragraph">
<p>The authentication screens let a user sign in with email and password, complete the mandatory one-time password (OTP, a short code delivered by email) step, recover a forgotten password, and sign out. Code lives in <code>frontend/src/app/features/auth/</code>, backed by the app-wide <code>AuthService</code> in <code>frontend/src/app/core/auth/auth.service.ts</code>.</p>
</div>
<div class="paragraph">
<p>The client never sees or stores a session token. The BFF delivers both the access and refresh tokens as HttpOnly cookies (cookies the browser attaches automatically but scripts cannot read), so <code>AuthService</code> keeps only one piece of state: a <code>sessionExpiresAt</code> signal holding the access-token expiry timestamp from the last session response. The <code>isAuthenticated</code> computed signal, used by <code>authGuard</code> on every protected route, is simply "that signal is not null".</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/login</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoginComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Two-step sign-in: credentials form, then the OTP challenge.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/forgot-password</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ForgotPasswordComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Two-step password recovery: request a reset code, then set a new password.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Logout is not a route: it is a button in the layout shell (<code>frontend/src/app/layout/shell.component.ts</code>), available on every authenticated screen.</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows">Flows</h4>
<div class="paragraph">
<p><strong>Login.</strong> The credentials step posts email and password. On success the BFF returns a challenge (the password alone never yields a session) and the component switches its <code>step</code> signal from <code>credentials</code> to <code>otp</code>. The response&#8217;s <code>challengeToken</code> is held in a private component field, in memory only. The masked destination (<code>sentTo</code>, for example a partially hidden email address) is passed to the shared <code>OtpComponent</code>, which shows "code sent to &#8230;&#8203;" and enforces the 6-character uppercase alphanumeric format. Submitting the code calls the 2FA endpoint with the challenge token; the BFF sets the session cookies and the client records only the expiry timestamp.</p>
</div>
<div class="paragraph">
<p><strong>Return-URL handling for the OAuth2 consent flow.</strong> After a successful 2FA verify, the component checks the <code>returnUrl</code> query parameter. <code>allowedReturnUrl</code> accepts it only if it starts with <code>/api/v1/oauth2/</code>, the prefix of the BFF&#8217;s own OAuth2 authorization endpoints. Those endpoints redirect an unauthenticated user to <code>/login?returnUrl=&#8230;&#8203;</code> during the open banking consent flow. An allowed value triggers a full page navigation (<code>window.location.assign</code>) back into the BFF so the authorization flow can resume with the fresh cookies; anything else is ignored and the router goes to <code>/summary</code>. This whitelist prevents the login page from being used as an open redirect.</p>
</div>
<div class="paragraph">
<p><strong>Forgot password.</strong> The first step submits just the email; the BFF always answers success (so the form cannot be used to probe which emails exist) and the screen advances to the reset step. The reset step collects the emailed OTP and a new password, validated client-side against the same policy as registration (15–64 characters with lower case, upper case, digit, and special character). Validation problems surface as translated toast messages, never inline English text. On success a toast confirms the reset and the user is returned to <code>/login</code>. These two calls go through <code>ProfileStore</code> because password recovery is a user-module operation on the BFF, not an authentication-module one.</p>
</div>
<div class="paragraph">
<p><strong>Logout.</strong> The shell&#8217;s logout button records a <code>LOGOUT</code> client audit event, calls the logout endpoint (the BFF denylists the access token and expires both cookies), clears the local session signal, and navigates to <code>/login</code>. The navigation happens even if the call fails, so a broken network cannot trap the user in an authenticated shell.</p>
</div>
<div class="paragraph">
<p><strong>Session upkeep (background).</strong> Two <code>core/</code> pieces support these screens. <code>authInterceptor</code> adds the <code>X-Device-Fingerprint</code> header (a random UUID kept in <code>localStorage</code>) to every <code>/api</code> request. <code>errorInterceptor</code> reacts to a bare 401 (no BFF error code in the body) by calling <code>AuthService.refresh()</code> and retrying the original request; the refresh is single-flight, so concurrent failures share one refresh. If the refresh also fails, or the BFF reports a device-fingerprint mismatch, the session signal is cleared and the router returns to <code>/login</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used">BFF endpoints used</h4>
<div class="paragraph">
<p>All methods below are generated <code>@bff/client</code> services.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Client call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit email and password</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>AuthenticationCommandControllerService.login</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the OTP code</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>AuthenticationCommandControllerService.verifyTwoFactor</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">(Automatic) renew an expired session</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>AuthenticationCommandControllerService.refreshSession</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Click logout in the shell</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>AuthenticationCommandControllerService.logout</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Request a password-reset code</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserCommandControllerService.forgotPassword</code> (via <code>ProfileStore</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit code and new password</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserCommandControllerService.resetPassword</code> (via <code>ProfileStore</code>)</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/authentication.adoc</code>; the password-reset endpoints are covered in <code>docs/consumer/features/user.adoc</code>.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_registration">Registration</h3>
<div class="sect3">
<h4 id="_purpose_2">Purpose</h4>
<div class="paragraph">
<p>The registration screen turns an existing Fineract client (a customer record that back office staff have already created in Fineract Core) into a consumer login. The user proves who they are with an identity document, confirms control of their email with an OTP (one-time password), and ends up with an account bound to that Fineract client. Code lives in <code>frontend/src/app/features/registration/</code>: one component holding the whole flow and a thin <code>RegistrationService</code> that wraps the generated client.</p>
</div>
<div class="paragraph">
<p>All three registration endpoints are public on the BFF: the flow runs without a session, and <code>/register</code> is deliberately outside the <code>authGuard</code>-protected shell.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_2">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/register</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>RegistrationComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The full three-step flow: identity form, OTP verification, done screen.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_flows_2">Flows</h4>
<div class="paragraph">
<p>The component is a small state machine: a <code>step</code> signal that moves from <code>identity</code> to <code>otp</code> to <code>done</code>.</p>
</div>
<div class="paragraph">
<p><strong>Identity step.</strong> The form collects the Fineract client id (a number, minimum 1), email, password, a document type, and the document number:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The password must be 15–64 characters and contain a lower-case letter, an upper-case letter, a digit, and a special character; the rule is shown as helper text under the field.</p>
</li>
<li>
<p>The document type is a select with two options, <code>SSN</code> and <code>Aadhaar</code>.</p>
</li>
<li>
<p>The document number field is rendered as a password input with autocomplete off, so the ID number is masked on screen and never offered to browser autofill.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Validation failures surface as translated toast messages (first failing field wins), never inline text. On submit the identity is posted to the BFF, which returns a <code>registrationId</code> and the masked last four digits of the document. Both are kept in signals, the step flips to <code>otp</code>, and the component immediately requests the first OTP.</p>
</div>
<div class="paragraph">
<p><strong>OTP step.</strong> The send-OTP call (delivery method <code>email</code>) returns the masked destination (<code>sentTo</code>), shown by the shared <code>OtpComponent</code>, and the code&#8217;s time to live in seconds (<code>tokenLiveTimeInSec</code>). That TTL seeds a resend cooldown: a "resend in <em>n</em> s" button counts down once per second and only becomes an active "resend" button at zero. The user therefore cannot hammer the send endpoint faster than a code expires. The code itself is 6 uppercase alphanumeric characters; the input forces uppercase as the user types. Verification posts the <code>registrationId</code> and code; when the BFF answers with status <code>BOUND</code> the cooldown timer is cleared and the step flips to <code>done</code>. A cancel button returns to the identity step.</p>
</div>
<div class="paragraph">
<p><strong>Done step.</strong> A confirmation screen shows "ID ending in &#8230;&#8203;" using the masked last-4 returned at submit time, plus a button to <code>/login</code>. That masked value is the only trace of the document the client ever renders. Registration does not sign the user in; the login flow (with its own OTP factor) is always the next step.</p>
</div>
<div class="paragraph">
<p><strong>What is never persisted client-side.</strong> Nothing from this flow touches <code>localStorage</code>, <code>sessionStorage</code>, or cookies. The document number and password exist only in the reactive form state, and the <code>registrationId</code>, masked values, and cooldown live in component signals. All of it is gone when the component is destroyed or the page reloads; a reload simply restarts the flow. OTP codes are typed, sent, and discarded; they are never stored, logged, or echoed back.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_2">BFF endpoints used</h4>
<div class="paragraph">
<p>All calls go through <code>RegistrationService</code>, which wraps the generated <code>@bff/client</code> service one-to-one.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Client call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the identity form</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>RegistrationCommandControllerService.submitRegistration</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Enter the OTP step, or click resend</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>RegistrationCommandControllerService.sendRegistrationOtp</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the OTP code</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>RegistrationCommandControllerService.verifyRegistrationOtp</code></p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/registration.adoc</code>; the identity-document match behind the submit call is covered in <code>docs/consumer/features/identity.adoc</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_test_coverage_2">Test coverage</h4>
<div class="ulist">
<ul>
<li>
<p>Vitest: <code>frontend/src/app/features/registration/registration.component.spec.ts</code> covers the identity-step submit guards (one translated toast per attempt, dispatch when every field is valid); <code>registration.service.spec.ts</code> covers the service wrapper posting the binding request and the OTP verification returning the <code>BOUND</code> status.</p>
</li>
<li>
<p>Playwright: <code>frontend/playwright/tests/registration.spec.ts</code> walks the full flow (identity form, OTP, success) in a real browser and asserts that neither the OTP code nor the document key is persisted to <code>localStorage</code> or <code>sessionStorage</code>.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_account_summary">Account summary</h3>
<div class="sect3">
<h4 id="_purpose_3">Purpose</h4>
<div class="paragraph">
<p>The summary screen is the dashboard a user lands on after login: one page showing their savings and loan accounts at a glance, with links into the detailed views. Code lives in <code>frontend/src/app/features/summary/</code>: a single component plus <code>SummaryStore</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_3">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/summary</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SummaryComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Dashboard with a savings card and a loans card, each showing the top accounts and a view-all link.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The route sits inside the authenticated layout shell and is the default destination after a successful login.</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows_3">Flows</h4>
<div class="paragraph">
<p>The component calls <code>SummaryStore.load()</code> in its constructor. The store makes a single aggregated call to the BFF and splits the response into two signals, <code>savingsCards</code> and <code>loanCards</code>. Each entry is mapped down to what the cards render: id, account number, product name, status, currency, and one money figure (the account balance for savings, the outstanding loan balance for loans). Rows missing an id are dropped, and both lists are sorted by account number (<code>byAccountNo</code> in <code>shared/utils/account-sort.ts</code>) so ordering is stable across reloads.</p>
</div>
<div class="paragraph">
<p>Everything else on the page is derived with <code>computed</code> signals on the store, so the template contains no logic:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>topSavings</code> and <code>topLoans</code> hold the first three entries of each list; only these are rendered as rows.</p>
</li>
<li>
<p><code>savingsCount</code> and <code>loansCount</code> hold the full counts, shown as "<em>n</em> accounts" in each card header and inside the "view all" links.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Each card renders its top-3 rows as links: product name with a status badge, the account number underneath, and the money figure on the right, formatted with the account&#8217;s own currency. Clicking a row navigates to <code>/savings/:id</code> or <code>/loans/:id</code>. When a list has more than zero accounts a "view all (<em>n</em>)" footer links to the full <code>/savings</code> or <code>/loans</code> list; when it is empty, the card shows a translated empty-state message instead. A progress bar is shown while the single load is in flight.</p>
</div>
<div class="paragraph">
<p>The screen is read-only and holds no state beyond the store&#8217;s signals. There are no filters, pagination, or actions here; those belong to the savings and loans features.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_3">BFF endpoints used</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Client call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open the dashboard</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SummaryQueryControllerService.getAccountsSummary</code></p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>One request paints the whole page; the BFF does the aggregation across savings and loans server-side. The server side is documented in <code>docs/consumer/features/summary.adoc</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_test_coverage_3">Test coverage</h4>
<div class="ulist">
<ul>
<li>
<p>Vitest: <code>frontend/src/app/features/summary/summary.store.spec.ts</code> covers <code>SummaryStore</code> against a mocked HTTP layer: mapping the single summary response into savings and loan cards, sorting and top-three slicing, rendering null balances as zero, and handling an empty summary.</p>
</li>
<li>
<p>Playwright: <code>frontend/playwright/tests/summary.spec.ts</code> covers the route guard: an unauthenticated visit to the dashboard redirects to <code>/login</code>.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_savings">Savings</h3>
<div class="sect3">
<h4 id="_purpose_4">Purpose</h4>
<div class="paragraph">
<p>The savings screens give the user a read-only view of their savings accounts: a list, an account detail page with balances, charges, and a filterable transaction history, and a drill-down page for a single transaction. Code lives in <code>frontend/src/app/features/savings/</code>: three route components, a <code>SavingsStore</code>, and <code>savings.routes.ts</code>, which wires them up as lazy children of <code>/savings</code>.</p>
</div>
<div class="paragraph">
<p>All state lives in <code>SavingsStore</code> signals (<code>accounts</code>, <code>selected</code>, <code>charges</code>, <code>transactions</code> plus its page metadata, <code>selectedTransaction</code>); components trigger loads in their constructors and read the signals in their templates. Money movement is not part of this feature; deposits and withdrawals are handled by the transfers feature, and the loan repayment screen lives in the loans feature (route <code>/loans/:loanId/repay</code>), reusing the transfers pipeline.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_4">Screens and routes</h4>
<div class="paragraph">
<p>All routes are children of <code>/savings</code>, inside the authenticated shell.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/savings</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsListComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Table of the user&#8217;s savings accounts (account number, product, status badge, currency); clicking a row opens the detail.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/savings/:savingsId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsDetailComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Balances, charges table, and paginated transaction history with a date-range filter.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/savings/:savingsId/transactions/:transactionId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsTransactionComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Detail card for one transaction, with a back link to the account.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_flows_4">Flows</h4>
<div class="paragraph">
<p><strong>Account detail.</strong> On entry the component fires three loads in parallel: the account itself, its charges, and the first transaction page (page 0, size 20). The header card shows the product name, account number, and status badge, then the balance, available balance, and nominal annual interest rate, with amounts formatted in the account&#8217;s currency. The charges table lists each charge&#8217;s name, amount, and amount outstanding, with an empty-state row when there are none.</p>
</div>
<div class="paragraph">
<p><strong>Transaction filter and pagination.</strong> The transaction section has a filter bar with a from date, a to date, and a page size (default 20). Ionic has no date-range picker, so the range is two separate <code>ion-datetime</code> pickers opened from buttons. While no value is chosen, the button label deliberately reads as a generic "date" placeholder; the raw Ionic control would otherwise display today&#8217;s date and make "no filter" look like a filter. Applying the filter snapshots the form into an <code>applied</code> signal and reloads from page 0, so paging always uses the last <code>applied</code> filter, not whatever is half-typed in the form. Dates are converted to ISO <code>yyyy-MM-dd</code> strings (<code>toIsoDate</code>) before the call. The pager below the table shows "showing <em>x</em>–<em>y</em> of <em>z</em>" from the page envelope the BFF returns (<code>page</code>, <code>size</code>, <code>totalElements</code>, <code>totalPages</code>). The previous/next buttons disable at the ends of the range and while a load is in flight.</p>
</div>
<div class="paragraph">
<p><strong>Transaction drill-down.</strong> Clicking a transaction row navigates to the transaction route; the page shows the type, amount, and running balance for that single transaction, fetched by id, with a back-to-account button. Transaction types arrive as stable code strings (for example <code>savingsAccountTransactionType.deposit</code>) and are rendered through the translation pipe.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_4">BFF endpoints used</h4>
<div class="paragraph">
<p>The store calls the generated <code>@bff/client</code> query service directly; there are no savings write operations in this feature.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Client call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open the savings list</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsQueryControllerService.listSavingsAccounts</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open an account detail</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsQueryControllerService.getSavingsAccount</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">(Same page) load the charges table</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsQueryControllerService.getSavingsCharges</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Apply a filter or change page</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsQueryControllerService.searchSavingsTransactions</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Click a transaction row</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsQueryControllerService.getSavingsTransaction</code></p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/savings.adoc</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_test_coverage_4">Test coverage</h4>
<div class="ulist">
<ul>
<li>
<p>Vitest: <code>frontend/src/app/features/savings/savings.store.spec.ts</code> covers <code>SavingsStore</code> against a mocked HTTP layer: loading and sorting the account list by account number, and forwarding the date-range filter while unwrapping the page envelope for transactions.</p>
</li>
<li>
<p>Playwright: <code>frontend/playwright/tests/savings.spec.ts</code> covers the route guard: an unauthenticated visit to the savings pages redirects to <code>/login</code>.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_loans">Loans</h3>
<div class="sect3">
<h4 id="_purpose_5">Purpose</h4>
<div class="paragraph">
<p>The loans screens cover the widest surface in the client. They provide browsing of loan accounts (including loans the user guarantees for other people), a detail page with figures, charges, guarantors, and filterable transactions, a loan application flow with a live schedule preview and draft management, and a repayment flow that reuses the transfers step-up. Code lives in <code>frontend/src/app/features/loans/</code>: five route components, a <code>LoansStore</code>, and <code>loans.routes.ts</code> wiring them up as lazy children of <code>/loans</code>.</p>
</div>
<div class="paragraph">
<p><code>LoansStore</code> holds all read state in signals and wraps three generated services: the loans query and command controllers, plus the user query controller for the obligee list. The repay screen additionally pulls in <code>TransfersStore</code> and <code>SavingsStore</code>, because a repayment is a transfer from a savings account.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_5">Screens and routes</h4>
<div class="paragraph">
<p>All routes are children of <code>/loans</code>, inside the authenticated shell.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansListComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Table of the user&#8217;s loan accounts, an "apply" button, and the obligees table.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/apply</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoanApplyComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan application: product select, terms form, schedule preview, submit/modify/withdraw a draft.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/:loanId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansDetailComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Overview figures, charges, guarantors, filterable transactions, conditional repay button.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/:loanId/repay</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoanRepayComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Repayment via the transfers step-up: form, OTP, done.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/:loanId/transactions/:transactionId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansTransactionComponent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Detail card for one transaction, with a back link to the loan.</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_flows_5">Flows</h4>
<div class="paragraph">
<p><strong>List and obligees.</strong> The list page loads two independent data sets. The first table is the user&#8217;s own loans (account number, product, status badge, currency; row click opens the detail). The second table, "obligees", flips the perspective: it lists loans belonging to other borrowers that the logged-in user guarantees. It shows the borrower&#8217;s display name, the loan&#8217;s account number, the loan amount, the guarantee amount, and the amount already released from the guarantee. That data comes from the user module (<code>getUserObligees</code>), not the loans query service, because it is a property of the user&#8217;s guarantor relationships rather than of any loan the user owns.</p>
</div>
<div class="paragraph">
<p><strong>Detail.</strong> On entry the component fires four loads: the account, its charges, its guarantors, and the first transaction page (page 0, size 20). The overview card shows principal disbursed, total outstanding, interest outstanding, the annual interest rate, and the next due amount and date. The guarantors table (people guaranteeing this loan) shows name, guarantor type, and relationship. The transaction section reuses the exact filter-and-pager mechanics of the savings detail: two <code>ion-datetime</code> pickers standing in for a range picker, a page-size field, an <code>applied</code> snapshot so paging honours the last applied filter, and a "showing <em>x</em>–<em>y</em> of <em>z</em>" pager. The one loan-specific column is outstanding loan balance instead of running balance. A "repay" button appears in the page header only when the loan&#8217;s <code>active</code> flag is true (<code>repayable</code> computed signal), and leads to the repay route.</p>
</div>
<div class="paragraph">
<p><strong>Loan application.</strong> The apply page loads the application template with no product id first, which returns the product options for the select plus defaults. Choosing a product reloads the template for that product. An <code>effect</code> then patches the form with the product&#8217;s defaults: principal, number of repayments, repayment frequency, and interest rate. Non-editable conventions (amortization type, interest type, calculation period, processing strategy) are carried as hidden form controls. The loan term frequency is pre-filled as number of repayments times repayment interval. The user can adjust the visible terms, then:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><strong>Preview</strong> posts the terms to the schedule-preview endpoint (a read-only calculation; nothing is created) and renders the repayment schedule (period, due date, principal due, total due, outstanding balance), with the total repayment expected in the card header.</p>
</li>
<li>
<p><strong>Submit</strong> creates a draft application on the BFF. Each submission carries an <code>Idempotency-Key</code> header (a random UUID) so a retried request cannot create a second application. The key is created lazily per attempt, cleared on success, and also cleared whenever any form value changes. Editing the form means the next submit is a genuinely new request, while re-clicking after a network hiccup replays the same one.</p>
</li>
<li>
<p>Once a draft exists, a draft card appears with "modify" (re-submits the current form against the draft&#8217;s loan id, with its own idempotency key) and "withdraw" (cancels the draft, using the form&#8217;s submitted-on date as the withdrawal date, after which the draft card disappears).</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Field-level validation failures surface as one translated toast per attempt (first failing field), consistent with the app-wide no-inline-errors convention.</p>
</div>
<div class="paragraph">
<p><strong>Repay with step-up OTP.</strong> Repayment is deliberately not a loans command: the screen drives the transfers pipeline with the loan as the destination (<code>toAccountType</code> of <code>LOAN</code>). A <code>step</code> signal walks through the <code>form</code>, <code>otp</code>, and <code>done</code> steps in order. The form offers the user&#8217;s savings accounts as the funding source (loaded from <code>SavingsStore</code>) and an amount, checked client-side to be at least 0.01 and no more than the loan&#8217;s total outstanding. A loan that is not active bounces straight back to the detail page with an error toast. Initiating the transfer returns a challenge: the BFF emails an OTP and the shared <code>OtpComponent</code> shows the masked destination. Confirming sends the challenge&#8217;s <code>stepUpToken</code>, the typed OTP, the original transfer fields, and an idempotency key (same lazy-create/clear-on-change pattern as the application). The done screen shows the transfer reference and amount, and the loan and its transactions are reloaded so the new balance is visible on return.</p>
</div>
<div class="paragraph">
<p><strong>Transaction drill-down.</strong> As in savings: a single-transaction card with type, amount, and outstanding loan balance, plus a back link.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_5">BFF endpoints used</h4>
<div class="paragraph">
<p>All methods below are generated <code>@bff/client</code> services, called through <code>LoansStore</code> (or <code>TransfersStore</code> for the repay step-up).</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Client call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open the loans list</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.listLoanAccounts</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">(Same page) load the obligees table</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserQueryControllerService.getUserObligees</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open a loan detail</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.getLoanAccount</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">(Same page) load charges / guarantors</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.getLoanCharges</code>, <code>LoansQueryControllerService.getLoanGuarantors</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Apply a transaction filter or change page</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.listLoanTransactions</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Click a transaction row</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.getLoanTransaction</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open the apply page or pick a product</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.getLoanApplicationTemplate</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Preview the schedule</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansQueryControllerService.previewLoanSchedule</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the application (with <code>Idempotency-Key</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansCommandControllerService.submitLoanApplication</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Modify the draft (with <code>Idempotency-Key</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansCommandControllerService.modifyLoanApplication</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Withdraw the draft (with <code>Idempotency-Key</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansCommandControllerService.withdrawLoanApplication</code></p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Initiate a repayment</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersCommandControllerService.initiateTransfer</code> (via <code>TransfersStore</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm the repayment with the OTP (with <code>Idempotency-Key</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersCommandControllerService.confirmTransfer</code> (via <code>TransfersStore</code>)</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/loans.adoc</code>; the repayment pipeline in <code>docs/consumer/features/transfers.adoc</code>; the obligee query in <code>docs/consumer/features/user.adoc</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_test_coverage_5">Test coverage</h4>
<div class="ulist">
<ul>
<li>
<p>Vitest: <code>frontend/src/app/features/loans/loans.store.spec.ts</code> covers <code>LoansStore</code> against a mocked HTTP layer (list sorting, obligees, the transaction filter and page envelope, schedule preview, and the draft lifecycle); <code>loan-apply.component.spec.ts</code> covers the application form&#8217;s submit and modify guards; <code>loan-repay.component.spec.ts</code> covers the repayment form guards, the live outstanding-balance ceiling, and the non-active-loan bounce.</p>
</li>
<li>
<p>Playwright: <code>frontend/playwright/tests/loans.spec.ts</code> covers the guarded-route redirect, the repay button hidden on inactive loans, the repay OTP step-up happy path, and the wrong-OTP error toast.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_transfers">Transfers</h3>
<div class="sect3">
<h4 id="_purpose_6">Purpose</h4>
<div class="paragraph">
<p>The transfers feature gives the customer two screens: a paginated history of past transfers and a guided flow for sending money to their own savings accounts or to saved beneficiaries. The new-transfer flow is a step-up flow (step-up: an extra one-time-code challenge required on top of the normal login before a sensitive action completes): the form submission only initiates the transfer; money moves only after the customer enters the OTP (one-time password) and the confirm call succeeds.</p>
</div>
<div class="paragraph">
<p>Code lives under <code>frontend/src/app/features/transfers/</code>. Shared state is held in <code>TransfersStore</code>, a signal-backed service that wraps the generated <code>@bff/client</code> transfer services.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_6">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/transfers</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransferComponent</code> (<code>transfer.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Transfer history table with pagination and a button to start a new transfer.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/transfers/new</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransferFormComponent</code> (<code>transfer-form.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Three-step new-transfer flow: form, OTP challenge, success summary.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Both routes sit inside the authenticated shell layout and are protected by <code>authGuard</code>; an unauthenticated visit redirects to <code>/login</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows_6">Flows</h4>
<div class="paragraph">
<p><strong>History list.</strong> On load, <code>TransferComponent</code> fetches page 0 with a fixed page size of 10. Each row shows the date, source and destination account, amount with currency, and a direction column. Direction comes from the BFF as <code>OUTGOING</code> or <code>INCOMING</code> and is rendered through a translation key (<code>transfers.history.direction.&lt;value&gt;</code>), so the label is localized rather than the raw enum. Previous/Next buttons page through results using the page metadata (<code>page</code>, <code>size</code>, <code>totalElements</code>, <code>totalPages</code>) in the response envelope, and a "showing X to Y of Z" line is computed from the same metadata. The generated client accepts optional <code>fromDate</code> and <code>toDate</code> filters, but the history screen does not expose them; it always passes them as undefined.</p>
</div>
<div class="paragraph">
<p><strong>New transfer, step <code>form</code>.</strong> The form has three fields: a source account select (the customer&#8217;s own savings accounts, loaded via the savings store), a destination select, and an amount. The destination select is grouped into "my savings" (the customer&#8217;s other accounts, excluding the selected source) and "beneficiaries" (saved payees that resolve to a Fineract account id). Picking a source account that matches the current destination clears the destination, so a transfer to the same account cannot be built. Validation failures (no source, no destination, amount missing or below 0.01) surface as translated toast messages, never inline text. Submitting calls initiate, which sends the transfer details plus the <code>X-Device-Fingerprint</code> header and returns a challenge containing a <code>stepUpToken</code> and a masked <code>sentTo</code> hint (where the OTP was delivered).</p>
</div>
<div class="paragraph">
<p><strong>New transfer, step <code>otp</code>.</strong> The shared <code>app-otp</code> component prompts for the six-character code, showing the masked destination from the challenge. Cancel returns to the form without losing the entered values.</p>
</div>
<div class="paragraph">
<p><strong>New transfer, step <code>done</code>.</strong> Confirm sends the step-up token, the OTP, and the original transfer details, together with an <code>Idempotency-Key</code> header (idempotency key: a client-chosen unique value that lets the server recognize a retry of the same request and execute the money movement only once). The component generates the key with <code>crypto.randomUUID()</code> on the first confirm attempt and reuses the same key on retries (for example after a wrong OTP), so a retry can never debit twice. Any change to the form values resets the key to null, because changed values describe a different transfer that must get a fresh key. On success the key is cleared, the store keeps the returned result, and the done step renders the transfer reference, accounts, and amount.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_6">BFF endpoints used</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Generated <code>@bff/client</code> call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">View transfer history (page load, Previous/Next)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersQueryControllerService.listTransfers(fromDate, toDate, page, size)</code> (<code>GET /api/v1/transfers</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Populate the source/destination selects</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsQueryControllerService.listSavingsAccounts()</code> (via <code>SavingsStore</code>) and <code>BeneficiariesQueryControllerService.listBeneficiaries()</code> (via <code>BeneficiariesStore</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the transfer form</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersCommandControllerService.initiateTransfer(xDeviceFingerprint, request)</code> (<code>POST /api/v1/transfers/initiate</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Enter the OTP and confirm</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersCommandControllerService.confirmTransfer(xDeviceFingerprint, idempotencyKey, request)</code> (<code>POST /api/v1/transfers/confirm</code> with the <code>Idempotency-Key</code> header)</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/transfers.adoc</code>, including the ABAC checks, beneficiary transfer limits, and how the idempotency key is namespaced per user and forwarded to Fineract.</p>
</div>
</div>
<div class="sect3">
<h4 id="_test_coverage_6">Test coverage</h4>
<div class="ulist">
<ul>
<li>
<p>Vitest: <code>frontend/src/app/features/transfers/transfers.store.spec.ts</code> covers <code>TransfersStore</code> against a mocked HTTP layer (the initiate challenge, the confirm result, and the history paging metadata); <code>transfer-form.component.spec.ts</code> covers the submit guards and the destination-option rules (excluding the chosen source and the beneficiary that points at it).</p>
</li>
<li>
<p>Playwright: <code>frontend/playwright/tests/transfers.spec.ts</code> covers the guarded-route redirect, history-to-form navigation, the transfer OTP step-up happy path, and the wrong-OTP error toast.</p>
</li>
</ul>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_beneficiaries">Beneficiaries</h3>
<div class="sect3">
<h4 id="_purpose_7">Purpose</h4>
<div class="paragraph">
<p>The beneficiaries screen manages saved payees: destination accounts the customer registers once and can then pick from the transfer form. It is a single route that behaves like a small state machine. The list, the add form, the edit form, and the OTP challenge are all cases of one component, switched by a <code>step</code> signal, so the customer never leaves the page while adding or editing.</p>
</div>
<div class="paragraph">
<p>Code lives under <code>frontend/src/app/features/beneficiaries/</code>. <code>BeneficiariesStore</code> holds the loaded list and the current step-up challenge as signals and wraps the generated <code>@bff/client</code> services; the same store is reused by the transfer form to populate its destination select.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_7">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/beneficiaries</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesComponent</code> (<code>beneficiaries.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">List, add, edit, and delete beneficiaries. Internal steps: <code>list</code>, <code>add-form</code>, <code>edit-form</code>, <code>otp</code>.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The route sits inside the authenticated shell and is protected by <code>authGuard</code>. Opening it also records a <code>SENSITIVE_VIEW</code> client audit event (see the shared UI chapter).</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows_7">Flows</h4>
<div class="paragraph">
<p><strong>List.</strong> The table shows each beneficiary&#8217;s name, transfer limit (rendered as a dash when unset), and per-row edit and delete icon buttons. The list is refreshed from the BFF on entry and after every successful write.</p>
</div>
<div class="paragraph">
<p><strong>Add.</strong> The add form collects name (required, max 50 characters), office name (required), account number (required), and an optional transfer limit (minimum 0.01 when given). The transfer limit is a per-beneficiary cap: the BFF rejects any later transfer to this payee above it. Validation failures surface as translated toasts, never inline text. Submitting calls the initiate endpoint with the <code>X-Device-Fingerprint</code> header. The BFF responds with a challenge (<code>stepUpToken</code> plus a masked <code>sentTo</code> delivery hint) and the component moves to the <code>otp</code> step.</p>
</div>
<div class="paragraph">
<p><strong>Edit.</strong> The edit form is narrower: only the name and transfer limit can change. The destination account itself is immutable, so redirecting an existing payee to a different account requires deleting and re-adding. Edit follows the same initiate-then-confirm shape as add, addressed by the beneficiary&#8217;s public UUID.</p>
</div>
<div class="paragraph">
<p><strong>OTP step-up.</strong> Both add and edit converge on the shared <code>app-otp</code> component. An <code>otpMode</code> signal remembers which write is in flight, so confirming sends either the add payload or the edit payload together with the <code>stepUpToken</code> and the entered OTP (one-time password). Cancelling returns to whichever form the customer came from, with values intact. On success a confirmation toast is shown, the step returns to <code>list</code>, and the list is reloaded. This completes the full cycle from the list, through the form and the OTP challenge, and back to the list.</p>
</div>
<div class="paragraph">
<p><strong>Delete.</strong> Delete is a single call with no OTP challenge. This mirrors the server, where <code>DELETE /api/v1/beneficiaries/{publicId}</code> requires no step-up: it is a soft delete and removes risk rather than creating it. The row&#8217;s delete button is disabled while its request is in flight, and a toast confirms the removal.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_7">BFF endpoints used</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Generated <code>@bff/client</code> call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">View the list (entry and after each write)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesQueryControllerService.listBeneficiaries()</code> (<code>GET /api/v1/beneficiaries</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the add form</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesCommandControllerService.initiateAddBeneficiary(xDeviceFingerprint, request)</code> (<code>POST /api/v1/beneficiaries/initiate</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm add with OTP</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesCommandControllerService.confirmAddBeneficiary(xDeviceFingerprint, request)</code> (<code>POST /api/v1/beneficiaries/confirm</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit the edit form</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesCommandControllerService.initiateUpdateBeneficiary(xDeviceFingerprint, publicId, request)</code> (<code>PUT /api/v1/beneficiaries/{publicId}/initiate</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm edit with OTP</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesCommandControllerService.confirmUpdateBeneficiary(xDeviceFingerprint, publicId, request)</code> (<code>PUT /api/v1/beneficiaries/{publicId}/confirm</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Delete a beneficiary</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesCommandControllerService.deleteBeneficiary(publicId)</code> (<code>DELETE /api/v1/beneficiaries/{publicId}</code>)</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Submitting the add form additionally records a <code>SENSITIVE_ACTION</code> client audit event (<code>BENEFICIARY_ADD</code>) through the client audit service.</p>
</div>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/beneficiaries.adoc</code>, including account resolution, duplicate-name rules, and the soft-delete model.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="profile-settings">Profile and settings</h3>
<div class="sect3">
<h4 id="_purpose_8">Purpose</h4>
<div class="paragraph">
<p>Two adjacent screens cover the customer&#8217;s own account. The profile page is a read-only view of who the customer is: identity card, profile picture, KYC status, and their fees. The settings page holds the things they can change and control: the password, changed via a step-up OTP flow, and the open banking consents granted to third-party apps.</p>
</div>
<div class="paragraph">
<p>Code lives under <code>frontend/src/app/features/profile/</code> and <code>frontend/src/app/features/settings/</code>. Each screen has its own signal-backed store (<code>ProfileStore</code>, <code>SettingsStore</code>) wrapping the generated <code>@bff/client</code> services.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_8">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/profile</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ProfileComponent</code> (<code>profile.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Identity card (name, account number, status, masked contact details, KYC status, photo) plus a filterable, paginated charges table.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/settings</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SettingsComponent</code> (<code>settings.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Change-password card (embeds <code>ChangePasswordComponent</code>) and the connected-apps table of open banking consents with a revoke action.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Both routes sit inside the authenticated shell behind <code>authGuard</code>, and visiting either records a <code>SENSITIVE_VIEW</code> client audit event.</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows_8">Flows</h4>
<div class="paragraph">
<p><strong>Profile card.</strong> The card shows display name, account number, active/inactive status, member-since date, email, mobile number, and a KYC line (KYC: know-your-customer, the identity verification the BFF ran during registration) rendered as verified or pending. Email and mobile arrive from the BFF already masked (<code>maskedEmail</code>, <code>maskedMobile</code>); the full values never reach the browser. If the profile says an image exists (<code>hasImage</code>), an <code>effect</code> lazily fetches it (requested at most 256×256) and renders it as a data URI. When there is no image or the fetch has not completed, a generic person icon is shown as the fallback avatar, so the layout never breaks.</p>
</div>
<div class="paragraph">
<p><strong>Charges list.</strong> Below the card, a table lists the customer&#8217;s charges (fees levied on their accounts) with name, due date, amount, outstanding amount, and an open/closed status derived from the row&#8217;s <code>active</code> flag. A filter bar offers a status select (<code>all</code>, <code>active</code>, <code>inactive</code>) plus explicit page and size number inputs, so pagination here is filter-driven rather than Previous/Next buttons. A total line shows <code>totalFilteredRecords</code> from the response. The initial load uses status <code>all</code>, page 0, size 20.</p>
</div>
<div class="paragraph">
<p><strong>Change password.</strong> A two-step step-up flow inside the settings page. The form takes the current password and the new one; the new password is validated client-side (15–64 characters, with lower, upper, digit, and special character) before anything is sent, with failures surfacing as translated toasts. Initiate sends only the current password (plus the <code>X-Device-Fingerprint</code> header) and returns an OTP challenge with a masked <code>sentTo</code> hint. The new password travels only in the confirm call, together with the <code>stepUpToken</code> and the entered OTP (one-time password). Success shows a toast and resets the form; cancel from the OTP step returns to the form.</p>
</div>
<div class="paragraph">
<p><strong>Connected apps.</strong> The settings page lists the customer&#8217;s open banking consents. Each row shows the TPP client id (TPP: third-party provider, an external app the customer authorised), the granted permissions joined into a comma list, a status badge, and the granted and expiry dates. The badge statuses (<code>AWAITING_AUTHORISATION</code>, <code>AUTHORISED</code>, <code>REJECTED</code>, <code>REVOKED</code>) are translated via <code>settings.connectedApps.status.*</code> keys. Only rows in status <code>AUTHORISED</code> show a revoke button; revoking disables that row&#8217;s button while in flight and reloads the list on success. Revocation is immediate on the server and also kills the TPP&#8217;s refresh tokens.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_8">BFF endpoints used</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Generated <code>@bff/client</code> call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open the profile page</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserQueryControllerService.getUserProfile()</code> (<code>GET /api/v1/user/profile</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Load the profile picture</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserQueryControllerService.getUserImage(maxWidth, maxHeight)</code> (<code>GET /api/v1/user/image</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Filter or page the charges table</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserQueryControllerService.getUserCharges(status, page, size)</code> (<code>GET /api/v1/user/charges</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Submit current password</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserCommandControllerService.initiatePasswordChange(xDeviceFingerprint, request)</code> (<code>POST /api/v1/user/password/change/initiate</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Confirm password change with OTP</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>UserCommandControllerService.confirmPasswordChange(xDeviceFingerprint, request)</code> (<code>POST /api/v1/user/password/change/confirm</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">List connected apps</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>OpenBankingUserConsentQueryControllerService.listConsents()</code> (<code>GET /api/v1/openbanking/consents</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Revoke a consent</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>OpenBankingUserConsentCommandControllerService.revokeConsent(consentId)</code> (<code>POST /api/v1/openbanking/consents/{consentId}/revoke</code>)</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side is documented in <code>docs/consumer/features/user.adoc</code> (profile, image, charges, password change) and <code>docs/consumer/features/openbanking.adoc</code> (the consent model behind the connected-apps table).</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_consent_screen">Consent screen</h3>
<div class="sect3">
<h4 id="_purpose_9">Purpose</h4>
<div class="paragraph">
<p>The consent screen is the page where the customer approves or denies a third-party&#8217;s request to read their account data. It is the browser-facing half of the open banking authorization ceremony: a TPP (third-party provider, an external app such as an account aggregator) sends the customer&#8217;s browser to the BFF&#8217;s OAuth2 authorize endpoint, the BFF authenticates the customer and then renders this Angular route so the customer can decide.</p>
</div>
<div class="paragraph">
<p>Code lives under <code>frontend/src/app/features/consent/</code>. Unlike every other feature, this screen makes no <code>@bff/client</code> call at all. Its only outbound traffic is a classic HTML form post, because the decision must land on the authorization endpoint as a normal browser navigation so the BFF can answer with the OAuth2 redirect back to the TPP.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_9">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/consent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ConsentComponent</code> (<code>consent.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Shows who is asking and for what, and posts the allow/deny decision back to the BFF.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The route is guarded by <code>authGuard</code> but deliberately rendered outside the shell layout (no sidenav or toolbar), because the customer is mid-ceremony rather than browsing the app.</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows_9">Flows</h4>
<div class="paragraph">
<p><strong>How the browser lands here.</strong> The TPP redirects the customer to <code>GET /api/v1/oauth2/authorize</code> with the standard OAuth2 parameters plus a <code>consent_id</code>. If the customer has no session, the BFF bounces them to <code>/login</code> first; once authenticated, the BFF sends the browser to <code>/consent</code> carrying three query parameters that this component reads from the route snapshot:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Query parameter</th>
<th class="tableblock halign-left valign-top">Use</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>client_id</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The requesting TPP&#8217;s client id, shown in the intro text ("\`&lt;client_id&gt;\` is asking…").</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>state</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Opaque ceremony state that must be echoed back on the decision post so the authorization server can correlate it.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>scope</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Space-separated list of requested scopes, split into individual entries for display.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>If <code>client_id</code> or <code>state</code> is missing, the component renders an invalid-request message instead of the decision buttons.</p>
</div>
<div class="paragraph">
<p><strong>Scope label rendering.</strong> Each scope is looked up in a small map (<code>SCOPE_LABEL_KEYS</code>) that turns machine scopes into translated, human-readable permission lines. The single mapped scope is <code>openbanking:accounts.read</code> → <code>consent.scope.accountsRead</code>. An unmapped scope falls back to displaying the raw scope string, so a new scope degrades visibly rather than silently.</p>
</div>
<div class="paragraph">
<p><strong>Allow and deny.</strong> Each button is its own plain HTML <code>&lt;form method="post" action="/api/v1/oauth2/authorize"&gt;</code> containing hidden inputs for <code>client_id</code>, <code>state</code>, and <code>_csrf</code>. CSRF is cross-site request forgery, where another site tricks the browser into posting with your cookies; the token proves the post came from this page. It is read from the <code>XSRF-TOKEN</code> cookie that the BFF set, URL-decoded, and embedded as the <code>_csrf</code> field. The "allow" form additionally includes one hidden <code>scope</code> input per requested scope; the "deny" form includes none, because posting the decision with no approved scopes is how the authorization server records a denial. Because these are native form posts, the whole page navigates. The BFF records the decision, updates the consent row (<code>AUTHORISED</code> or <code>REJECTED</code>), emits a <code>CONSENT_GRANTED</code> or <code>CONSENT_DENIED</code> audit event, and redirects the browser to the TPP&#8217;s registered redirect URI with the authorization code or error.</p>
</div>
</div>
<div class="sect3">
<h4 id="_relation_to_the_open_banking_feature">Relation to the open banking feature</h4>
<div class="paragraph">
<p>This screen is one step of the larger consent lifecycle: the TPP creates the consent via its own API, the customer decides here, and afterwards the consent appears (with status and expiry) in the connected-apps table on <code>/settings</code>, where it can be revoked. The full ceremony (consent statuses, token scoping, refresh behavior, and the audit trail) is documented in <code>docs/consumer/features/openbanking.adoc</code>. The connected-apps management surface is covered in Profile and settings.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_demo_screen">Demo screen</h3>
<div class="sect3">
<h4 id="_purpose_10">Purpose</h4>
<div class="paragraph">
<p>The demo screen exists to make two invisible mechanisms visible to someone evaluating the project: the audit trail the app quietly builds, and the fact that authorization decisions are made by the BFF, not the browser. It is deliberately demo-only tooling. The page opens with a translated note (<code>demo.note</code>) saying so, and its backing read endpoint is feature-flagged off in a default BFF deployment; only the local Docker stack enables it.</p>
</div>
<div class="paragraph">
<p>Code lives under <code>frontend/src/app/features/demo/</code>. <code>DemoStore</code> is the signal-backed wrapper around the generated audit query client.</p>
</div>
</div>
<div class="sect3">
<h4 id="_screens_and_routes_10">Screens and routes</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Route</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/demo</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>DemoComponent</code> (<code>demo.component.ts</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Paginated viewer of the caller&#8217;s own audit events, plus two buttons that provoke ABAC denials on purpose.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The route sits inside the authenticated shell behind <code>authGuard</code>. Visiting it is itself recorded as a <code>SENSITIVE_VIEW</code> audit event, so opening the page adds to the very list it displays.</p>
</div>
</div>
<div class="sect3">
<h4 id="_flows_10">Flows</h4>
<div class="paragraph">
<p><strong>Audit event viewer.</strong> The viewer is a table of the logged-in customer&#8217;s own audit events, newest first. It shows four columns: event type (for example <code>NAVIGATION</code>, <code>LOGIN_SUCCESS</code>, <code>API_FAILURE</code>), severity (<code>INFO</code>, <code>WARN</code>, <code>CRITICAL</code>), source (<code>CLIENT</code> for rows the browser reported, <code>SERVER</code> for rows the BFF observed itself), and the server-received timestamp. Only <code>receivedAt</code> is shown: the BFF never returns event details, device fingerprints, or the untrusted client-claimed time. Pagination is Previous/Next with a fixed page size of 10. Because the endpoint returns a plain list with no total count, the Next button is disabled heuristically when a page comes back with fewer than 10 rows.</p>
</div>
<div class="paragraph">
<p><strong>ABAC denial demo.</strong> Two red buttons, "try a forbidden savings account" and "try a forbidden loan", navigate to <code>/savings/999999</code> and <code>/loans/999999</code>. These are detail routes for resources the logged-in customer does not own. The detail page loads normally and issues its read; the BFF&#8217;s policy evaluator (ABAC: attribute-based access control, authorization decided from attributes of the caller and the resource) rejects the request with HTTP 403, so the forbidden account read itself never reaches Fineract (the evaluator may call Fineract for the caller&#8217;s own account list when its ownership cache misses). The shared error interceptor turns the <code>ConsumerApiError</code> body into a translated toast, and the failure is recorded as an <code>API_FAILURE</code> client audit event, which then shows up in the table above after the next refresh alongside the server&#8217;s own <code>ACCESS_DENIED</code> row. This is the point of the page. The frontend happily asks, the BFF is the enforcement point that says no, and the UI degrades to a toast rather than a raw error page.</p>
</div>
</div>
<div class="sect3">
<h4 id="_bff_endpoints_used_9">BFF endpoints used</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">User action</th>
<th class="tableblock halign-left valign-top">Generated <code>@bff/client</code> call</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">View or page the audit trail</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>AuditQueryControllerService.listAuditEvents(page, size)</code> (<code>GET /api/v1/audit/events</code>, flag-gated by <code>consumer.audit.query-enabled</code>)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Press an ABAC-denial button</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">There is no direct call. The button navigates to the savings or loans detail route, whose own store issues <code>GET /api/v1/savings/{id}</code> or <code>GET /api/v1/loans/{id}</code> and receives the 403.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The server side (the audit table, the query endpoint&#8217;s feature flag and self-only scoping, and the event catalog) is documented in <code>docs/consumer/features/audit.adoc</code>. The denial machinery is documented in <code>docs/consumer/security/abac.adoc</code>.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_shared_ui_layer">Shared UI layer</h3>
<div class="sect3">
<h4 id="_purpose_11">Purpose</h4>
<div class="paragraph">
<p>This chapter covers the cross-cutting client code that every feature screen relies on. It documents the small set of shared components, the styling architecture, the translation (i18n) pipeline, the error-to-toast pipeline, and the client-side audit service. None of this contains business logic: the frontend renders state and dispatches actions, and the BFF decides.</p>
</div>
</div>
<div class="sect3">
<h4 id="_shared_components">Shared components</h4>
<div class="paragraph">
<p>Everything reusable lives under <code>frontend/src/app/shared/</code>. The inventory is deliberately small:</p>
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
<th class="tableblock halign-left valign-top">File</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>app-page-header</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>shared/ui/page-header.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Page title, optional subtitle, and a content-projected action slot (for example the "new transfer" button).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>app-status-badge</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>shared/ui/status-badge.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Translated status pill. A <code>classify</code> function maps the status text to a tone (success, warning, error, neutral) by keyword: <code>active</code>, <code>approved</code>, and <code>authorised</code> are green; <code>pending</code>, <code>submitted</code>, and <code>awaiting</code> are amber; <code>rejected</code> and <code>revoked</code> are red. Unrecognized statuses degrade to neutral rather than breaking.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>app-language-switcher</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>shared/language-switcher.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Globe button with a popover listing English and Hindi (shown by endonym); selecting one calls <code>I18nService.use</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>app-otp</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>shared/otp/otp.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The OTP challenge form used by registration verification, login 2FA, transfers, beneficiaries, loan repayment, and password change: a six-character code input (pattern <code>[A-Z0-9]{6}</code>, auto-uppercased), a masked "sent to" hint, and verify/cancel buttons emitting <code>submitted</code>/<code>cancelled</code> outputs. It renders and validates only; each caller owns the confirm call.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p><code>shared/utils/</code> adds two pure helpers: <code>account-sort.ts</code> (<code>byAccountNo</code>, a null-safe comparator for account lists) and <code>date.ts</code> (<code>toIsoDate</code>, trims a datetime string to <code>yyyy-MM-dd</code> for BFF date filters).</p>
</div>
</div>
<div class="sect3">
<h4 id="_styling_architecture">Styling architecture</h4>
<div class="paragraph">
<p>Styling has three layers, from global to local:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><strong>Design tokens</strong> in <code>frontend/src/styles.scss</code>: a global reset plus CSS custom properties on <code>:root</code> covering the cobalt brand palette, page/surface/ink/slate neutrals, semantic tint pairs (<code>--success</code>/<code>--success-tint</code> and so on), radii, shadows, a type scale (<code>--text-2xs</code> through <code>--text-3xl</code>), motion durations, and standard field widths. Components reference tokens, never raw hex values.</p>
</li>
<li>
<p><strong>Shared CSS partials</strong> in <code>frontend/src/app/shared/css/</code>: <code>actions.scss</code>, <code>badge.scss</code>, <code>centered-page.scss</code>, <code>detail-page.scss</code>, <code>filter-bar.scss</code>, <code>form.scss</code>, <code>icon-button.scss</code>, <code>pager.scss</code>, <code>table.scss</code>, <code>transaction-page.scss</code>. The rule is that CSS needed by two or more features is hoisted here and pulled in per component via <code>styleUrls</code>. There is no global import, so a screen only ships the partials it names.</p>
</li>
<li>
<p><strong>Per-component styles</strong>: anything used by a single component stays inline in its <code>styles</code> block.</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_the_i18n_pipeline">The i18n pipeline</h4>
<div class="paragraph">
<p>Translation uses ngx-translate (a library that resolves dot-separated keys against JSON catalogs at runtime). The catalogs live in <code>frontend/public/i18n/en.json</code> and <code>hi.json</code> and are fetched over HTTP (loader prefix <code>/i18n/</code>, suffix <code>.json</code>), with English as the fallback language. <code>I18nService</code> (<code>core/i18n/i18n.service.ts</code>) wraps the library: it restores the saved choice from <code>localStorage</code> key <code>app.lang</code> at startup, and <code>use(code)</code> switches language and persists it. Templates use the <code>translate</code> pipe; imperative code (toasts) calls <code>I18nService.translate</code>.</p>
</div>
<div class="paragraph">
<p>A guard script keeps the templates honest: <code>npm run i18n:check</code> runs <code>frontend/scripts/check-i18n.mjs</code>, which parses every component template with the Angular compiler and flags hardcoded user-facing text, both text nodes and watched attributes (<code>title</code>, <code>placeholder</code>, <code>aria-label</code>, <code>matTooltip</code>, <code>alt</code>). Two allowlists exempt known cases. <code>STRING_ALLOWLIST</code> permits the terms "SSN" and "Aadhaar", and <code>TAG_ALLOWLIST</code> contains only <code>mat-icon</code>, a tag the app does not use; the app renders <code>ion-icon</code>, so no icon tag actually in use is allowlisted.</p>
</div>
</div>
<div class="sect3">
<h4 id="_the_error_to_toast_pipeline">The error-to-toast pipeline</h4>
<div class="paragraph">
<p>The app has a single rule for showing errors: no inline error text anywhere; every failure becomes an Ionic toast (a transient message bar, 5 seconds, with a dismiss button). Two paths feed it:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><strong>Client-side validation.</strong> Components call <code>NotificationService.showError(key)</code> (<code>core/notifications/notification.service.ts</code>) with an i18n key.</p>
</li>
<li>
<p><strong>HTTP failures.</strong> <code>errorInterceptor</code> (<code>core/interceptors/error.interceptor.ts</code>) catches every failed response. BFF errors carry a <code>ConsumerApiError</code> body (<code>{code, defaultMessage}</code>; the type is hand-written in <code>src/app/api/</code> because it is only ever an error body). The message resolves in order: the <code>code</code> is translated as an i18n key; if no translation exists, the server&#8217;s <code>defaultMessage</code> is used; if there is no body at all, the generic <code>common.error.generic</code> key is shown. HTTP 429 gets a dedicated rate-limited message.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The interceptor also handles the non-toast cases: audit-endpoint and refresh-endpoint failures pass through silently; a bare 401 without an error code triggers a silent token refresh and retry (falling back to <code>/login</code> if that also fails); and a 403 carrying the device-fingerprint-mismatch code clears the session and forces re-login. Every handled failure is additionally recorded as an <code>API_FAILURE</code> audit event with the URL reduced to a template (numeric and UUID path segments replaced by <code>:id</code>, query string stripped) so no identifiers leak into audit details.</p>
</div>
</div>
<div class="sect3">
<h4 id="_client_side_audit_service">Client-side audit service</h4>
<div class="paragraph">
<p><code>AuditService</code> (<code>core/audit/audit.service.ts</code>) buffers audit events in memory and posts them in batches to the BFF. Six client event types exist: <code>SENSITIVE_VIEW</code>, <code>SENSITIVE_ACTION</code>, <code>CLIENT_ERROR</code>, <code>API_FAILURE</code>, <code>NAVIGATION</code>, <code>LOGOUT</code>. The producers are: the shell layout records <code>NAVIGATION</code> on every completed route change, <code>SENSITIVE_VIEW</code> for a fixed map of sensitive routes (account detail, transactions, beneficiaries, profile, settings, demo), and <code>LOGOUT</code>. <code>AuditErrorHandler</code> (registered as Angular&#8217;s global <code>ErrorHandler</code>) records <code>CLIENT_ERROR</code> with the message and top stack frame. The error interceptor records <code>API_FAILURE</code>, and the beneficiaries store records a <code>SENSITIVE_ACTION</code>.</p>
</div>
<div class="paragraph">
<p>The buffering mechanics:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The buffer caps at 50 events, with the oldest dropped first. A flush sends at most 50 per POST.</p>
</li>
<li>
<p>A flush is triggered by the buffer reaching 20 events, a 30-second interval timer, the page becoming hidden (<code>visibilitychange</code>), or recording a <code>LOGOUT</code> event.</p>
</li>
<li>
<p>Transport is a raw <code>fetch</code> with <code>keepalive: true</code> (not Angular&#8217;s <code>HttpClient</code>), so a flush started during tab close can still complete. Authentication rides on the httpOnly session cookie, and the <code>X-Device-Fingerprint</code> header is set explicitly.</p>
</li>
<li>
<p>A failed flush requeues the batch at the front of the buffer; after 3 consecutive failures the buffer is discarded entirely, so audit delivery can never wedge the app.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Before anything is buffered, <code>core/audit/pii-scrub.ts</code> scrubs the details (PII: personally identifiable information): <code>buildDetails</code> drops forbidden keys (<code>password</code>, <code>otp</code>, <code>ssn</code>, <code>token</code>), truncates values to 300 characters, and <code>scrubPii</code> replaces email-, SSN-, Aadhaar-, and card-number-like patterns with <code>[REDACTED]</code>. The BFF re-screens everything server-side and rejects events that still look like PII: the client scrub is data hygiene, and the server screen is the control.</p>
</div>
<div class="paragraph">
<p>The server half (ingestion limits, per-event validation, the trusted <code>received_at</code> timestamp, storage, and retention) is documented in <code>docs/consumer/features/audit.adoc</code>.</p>
</div>
</div>
</div>
</div>
`;export{e as default};