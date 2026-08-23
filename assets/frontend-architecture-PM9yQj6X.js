var e=`
<h2 id="_architecture">Architecture</h2>
<div class="sectionbody">
<div class="paragraph">
<p>This chapter describes the structure of the Angular demo client. It covers what the application is and how it boots, how feature state is held in signal-backed stores, how the app talks to the BFF through a generated typed client and an interceptor chain, and which technologies and idioms the codebase uses. Read the overview first; the other sections assume its route table and directory layout.</p>
</div>
<div class="sect2">
<h3 id="overview">Architecture Overview</h3>
<div class="sect3">
<h4 id="_what_the_frontend_is">What the frontend is</h4>
<div class="paragraph">
<p>The frontend in <code>frontend/</code> is an Angular single-page application. It exists to exercise the BFF&#8217;s endpoints end to end: every screen is a thin surface over one or more BFF API calls, and the app contains no business logic of its own. The BFF decides, and the frontend renders state and dispatches actions.</p>
</div>
<div class="paragraph">
<p>The frontend talks only to the BFF. It never calls Fineract Core directly; that boundary is the reason the project exists (see <code>docs/consumer/architecture/overview.adoc</code>). All HTTP calls go to relative <code>/api/&#8230;&#8203;</code> paths, which are proxied to the BFF in every environment (see BFF Integration).</p>
</div>
</div>
<div class="sect3">
<h4 id="_bootstrap_chain">Bootstrap chain</h4>
<div class="paragraph">
<p>The application starts in four steps:</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><code>src/main.ts</code> calls <code>bootstrapApplication(App, appConfig)</code>, the standalone-application entry point. There is no <code>NgModule</code>.</p>
</li>
<li>
<p><code>src/app/app.config.ts</code> supplies the <code>appConfig</code> providers: the router (<code>provideRouter(routes)</code>), the HTTP client with its interceptor chain, Ionic (<code>provideIonicAngular</code>), the translation service (ngx-translate, loading <code>/i18n/*.json</code>), the generated client&#8217;s <code>Configuration</code> (base path <code>''</code>), and a global <code>ErrorHandler</code> (<code>AuditErrorHandler</code>, which reports uncaught errors to the BFF audit endpoint). It also registers an app initializer that calls <code>AuthService.refresh()</code> once before the first screen renders, so a page reload silently restores the session from the BFF&#8217;s httpOnly refresh cookie.</p>
</li>
<li>
<p><code>src/app/app.ts</code> defines the root <code>App</code> component, which is nothing but a <code>&lt;router-outlet&gt;</code> (the placeholder where the router inserts the current screen).</p>
</li>
<li>
<p>The router then loads either a public screen (login, registration) or the authenticated shell.</p>
</li>
</ol>
</div>
</div>
<div class="sect3">
<h4 id="_routes">Routes</h4>
<div class="paragraph">
<p>All routes are declared in <code>src/app/app.routes.ts</code>, and two rules hold across the whole table. Every screen is lazy-loaded via <code>loadComponent</code> or <code>loadChildren</code>, meaning its JavaScript is only downloaded when the route is first visited. Everything outside the login, registration, and forgot-password screens requires a logged-in session, enforced by <code>authGuard</code> (a check the router runs before activating a route, described at the end of this section): the consent screen carries the guard directly, and all other screens nest under a path-less shell route the guard protects as a whole.</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Path</th>
<th class="tableblock halign-left valign-top">Component</th>
<th class="tableblock halign-left valign-top">Purpose</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">redirects to <code>/login</code> (<code>pathMatch: 'full'</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Entry redirect to the login screen</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/login</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/auth/login.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Login screen (password then OTP)</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/register</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/registration/registration.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Multi-step registration wizard</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/forgot-password</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/auth/forgot-password.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Password reset via emailed OTP</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/consent</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/consent/consent.component.ts</code> (rendered outside the shell)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Open banking consent approval screen</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">\`\` (shell)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>layout/shell.component.ts</code>; all rows below render inside it</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Layout wrapper for all authenticated screens</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/summary</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/summary/summary.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Dashboard aggregating savings and loans</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/savings</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/savings/savings.routes.ts</code> (<code>SAVINGS_ROUTES</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Savings account list</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/savings/:savingsId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>savings-detail.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Savings account detail: balance, charges, transactions</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/savings/:savingsId/transactions/:transactionId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>savings-transaction.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Single savings transaction detail</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/loans/loans.routes.ts</code> (<code>LOANS_ROUTES</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan account list</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/apply</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loan-apply.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan application form with schedule preview</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/:loanId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loans-detail.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan detail: outstanding balance, schedule, charges, guarantors</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/:loanId/repay</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loan-repay.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan repayment form</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/loans/:loanId/transactions/:transactionId</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loans-transaction.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Single loan transaction detail</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/transfers</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/transfers/transfer.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Transfer history list</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/transfers/new</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/transfers/transfer-form.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">New transfer form with OTP step</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/beneficiaries</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/beneficiaries/beneficiaries.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Saved-payee (beneficiary) management</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/profile</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/profile/profile.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">User profile, charges, profile picture</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/settings</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/settings/settings.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Password change and open banking consent management</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>/demo</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/demo/demo.component.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Demo screen querying back client-side audit events</p></td>
</tr>
</tbody>
</table>
</div>
<div class="sect3">
<h4 id="_app_shell">App shell</h4>
<div class="paragraph">
<p><code>src/app/layout/shell.component.ts</code> is the one hand-built layout for all authenticated screens. It renders:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>A header toolbar with the brand, a sidenav toggle, a language switcher, and a logout button.</p>
</li>
<li>
<p>An Ionic split pane (<code>ion-split-pane</code>) whose side menu lists the eight navigation entries (summary, savings, loans, transfers, beneficiaries, profile, settings, demo) as <code>routerLink</code> items; the collapsed state is a plain component signal.</p>
</li>
<li>
<p>An indeterminate <code>ion-progress-bar</code> shown while the router is navigating, driven by subscribing to <code>Router.events</code> (<code>NavigationStart</code> sets a <code>loading</code> signal, <code>NavigationEnd</code>/<code>NavigationCancel</code>/<code>NavigationError</code> clear it).</p>
</li>
<li>
<p>A <code>&lt;router-outlet&gt;</code> for the active feature screen.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The shell is also where client-side audit events for navigation originate. Every <code>NavigationEnd</code> records a <code>NAVIGATION</code> event with the route template (parameter names, not values). A lookup table of sensitive route templates additionally records a <code>SENSITIVE_VIEW</code> event; for example, viewing a savings account records a <code>BALANCE</code> view. Logout records a <code>LOGOUT</code> event before calling <code>AuthService.logout()</code>.</p>
</div>
</div>
<div class="sect3">
<h4 id="_directory_layout">Directory layout</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Path under <code>frontend/src/app/</code></th>
<th class="tableblock halign-left valign-top">Contents</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>api/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Hand-written TypeScript types for BFF contracts the OpenAPI generator does not emit. One file: <code>consumer-api-error.ts</code>, the <code>ConsumerApiError</code> error envelope (<code>code</code>, <code>defaultMessage</code>) that the BFF returns on failures.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>core/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Singletons wired via <code>app.config.ts</code>: <code>auth/</code> (<code>AuthService</code>, <code>device-fingerprint.ts</code>), <code>guards/</code> (<code>authGuard</code>), <code>interceptors/</code> (<code>authInterceptor</code>, <code>errorInterceptor</code>), <code>audit/</code> (audit batching service, PII scrubbing, global error handler), <code>i18n/</code> (translation helper), <code>notifications/</code> (toast helper).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>features/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">One folder per BFF domain, each lazy-loaded: <code>auth</code>, <code>registration</code>, <code>consent</code>, <code>summary</code>, <code>savings</code>, <code>loans</code>, <code>transfers</code>, <code>beneficiaries</code>, <code>profile</code>, <code>settings</code>, <code>demo</code>. Eight of them (<code>summary</code>, <code>savings</code>, <code>loans</code>, <code>transfers</code>, <code>beneficiaries</code>, <code>profile</code>, <code>settings</code>, <code>demo</code>) hold their components plus a signal store (see State Management). The exceptions are <code>auth</code> (session state lives in the core <code>AuthService</code>), <code>registration</code> (a stateless service), and <code>consent</code> (a single component with no store or service).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>layout/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The single <code>shell.component.ts</code> described above.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>shared/</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Reusable presentation pieces: <code>otp/</code> (the OTP entry component used by every step-up flow), <code>ui/</code> (page header, status badge), <code>utils/</code> (account sorting, date helpers), <code>css/</code> (styles shared by two or more screens), and the language switcher.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The generated BFF client lives outside <code>app/</code>, in <code>frontend/src/openapi-client/</code> (imported as <code>@bff/client</code>); see BFF Integration.</p>
</div>
</div>
<div class="sect3">
<h4 id="_the_authguard">The authGuard</h4>
<div class="paragraph">
<p><code>src/app/core/guards/auth.guard.ts</code> is a functional guard (a <code>CanActivateFn</code>: a plain function the router calls before activating a route, instead of a guard class):</p>
</div>
<div class="ulist">
<ul>
<li>
<p>It injects <code>AuthService</code> and returns <code>true</code> when <code>auth.isAuthenticated()</code> is set.</p>
</li>
<li>
<p>Otherwise it returns <code>router.createUrlTree(['/login'])</code>, redirecting to the login screen.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p><code>isAuthenticated</code> is a <code>computed</code> over the session-expiry signal that the app initializer populates by attempting a refresh at startup. Deep links into guarded routes therefore survive a page reload as long as the refresh cookie is valid. The guard is a UX convenience only: the BFF rejects unauthenticated API calls regardless of what the client renders.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="state-management">State Management</h3>
<div class="sect3">
<h4 id="_the_signal_store_pattern">The signal-store pattern</h4>
<div class="paragraph">
<p>There is no state-management library (no NgRx, no component store). Each feature holds its state in a small hand-written store: an <code>@Injectable({ providedIn: 'root' })</code> service that exposes signals (Angular&#8217;s reactive state primitive: a value container that notifies the template when the value changes) plus methods that call the generated <code>@bff/client</code> services. The contract between the layers is as follows:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>Components never call the generated client directly; they inject the store.</p>
</li>
<li>
<p>Read data flows one way: a store method calls the generated client over HTTP, the response is written into a signal with <code>.set()</code>, and the template re-renders because it reads the signal.</p>
</li>
<li>
<p>Query methods (<code>load&#8230;&#8203;</code>) are fire-and-forget <code>void</code> methods; the store subscribes internally and the component just reads the resulting signals.</p>
</li>
<li>
<p>Mutation methods (<code>initiate</code>, <code>confirm</code>, <code>submit</code>, &#8230;&#8203;) return the <code>Observable</code> (an RxJS stream that emits the HTTP response) so the calling component can subscribe and drive its own step transitions (for example advancing a form to the OTP step).</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_worked_example_transfers">Worked example: transfers</h4>
<div class="paragraph">
<p>The transfer flow shows the whole chain end to end.</p>
</div>
<div class="olist arabic">
<ol class="arabic">
<li>
<p><strong>Route.</strong> <code>/transfers/new</code> lazy-loads <code>features/transfers/transfer-form.component.ts</code> (see Architecture Overview).</p>
</li>
<li>
<p><strong>Component.</strong> <code>TransferFormComponent</code> injects <code>TransfersStore</code> (plus <code>SavingsStore</code> and <code>BeneficiariesStore</code> to populate the account dropdowns). Submitting the form calls <code>store.initiate({&#8230;&#8203;})</code> and subscribes; on success it flips a local <code>step</code> signal from <code>'form'</code> to <code>'otp'</code>.</p>
</li>
<li>
<p><strong>Store.</strong> <code>features/transfers/transfers.store.ts</code> calls the generated <code>TransfersCommandControllerService.initiateTransfer(deviceFingerprint(), request)</code> and <code>tap\`s the response into its \`challenge</code> signal (the OTP challenge, including where the code was sent).</p>
</li>
<li>
<p><strong>Generated client.</strong> The <code>@bff/client</code> service issues <code>POST /api/v1/transfers/initiate</code> with typed request and response DTOs; the interceptor chain adds the device-fingerprint header (see BFF Integration).</p>
</li>
<li>
<p><strong>Signal to template.</strong> The OTP step reads <code>store.challenge()?.sentTo</code> directly in the template. Confirming calls <code>store.confirm(idempotencyKey, {&#8230;&#8203;})</code>, which sets the <code>result</code> signal and clears <code>challenge</code>; the <code>'done'</code> step renders <code>store.result()</code> fields.</p>
</li>
<li>
<p><strong>List screen.</strong> <code>/transfers</code> (<code>transfer.component.ts</code>) calls <code>store.loadHistory(page, size)</code> in its constructor. The store writes the page of <code>TransferQueryData</code> rows, plus the <code>historyPage</code> and <code>historyTotalPages</code> counters, into signals that the template&#8217;s table and pager read.</p>
</li>
</ol>
</div>
</div>
<div class="sect3">
<h4 id="_store_inventory">Store inventory</h4>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Store</th>
<th class="tableblock halign-left valign-top">File (under <code>frontend/src/app/features/</code>)</th>
<th class="tableblock halign-left valign-top">State held (signals)</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SummaryStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>summary/summary.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Aggregated savings and loan cards for the dashboard; <code>loading</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SavingsStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>savings/savings.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Account list, selected account, charges, paginated transactions (+ page/size/total counters), selected transaction, application template; <code>loading</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>LoansStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>loans/loans.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Loan list, selected loan, charges, guarantors, obligees, paginated transactions, selected transaction, application template, schedule preview, draft application; <code>loading</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>TransfersStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>transfers/transfers.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">OTP challenge, transfer result, paginated history; <code>historyLoading</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>BeneficiariesStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>beneficiaries/beneficiaries.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Beneficiary list, OTP challenge for add/update.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>ProfileStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>profile/profile.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">User profile, charges (+ total), profile image; <code>loading</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>SettingsStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>settings/settings.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Password-change OTP challenge, open banking consents.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>DemoStore</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>demo/demo.store.ts</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Client-side audit events queried back from the BFF; <code>loading</code>.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Three features have no store. <code>auth</code> keeps its session state in the core <code>AuthService</code> (see below). <code>registration/registration.service.ts</code> is a stateless pass-through to the generated registration client (submit identity, send OTP, verify OTP), because the multi-step wizard state lives entirely in the component. <code>consent</code> has neither store nor service; its component reads query parameters and posts native HTML forms straight to the BFF, so it makes no <code>@bff/client</code> call at all.</p>
</div>
</div>
<div class="sect3">
<h4 id="_conventions">Conventions</h4>
<div class="paragraph">
<p><strong>Loading signals.</strong> Stores whose screens fetch on entry expose a boolean <code>loading</code> signal (named <code>historyLoading</code> in <code>TransfersStore</code>). Load methods clear the data signal, set <code>loading</code> to <code>true</code>, and reset it in both the <code>next</code> and <code>error</code> callbacks. Templates bind it to an indeterminate <code>ion-progress-bar</code>; the shell shows the same bar for route transitions. Mutation flows track their in-flight state in a component-local <code>loading</code> signal instead, since the button being disabled is a per-screen concern.</p>
</div>
<div class="paragraph">
<p><strong>No error signals.</strong> Stores deliberately hold no error state. A failed call surfaces globally: the <code>errorInterceptor</code> translates the BFF&#8217;s <code>ConsumerApiError</code> code into a toast (see BFF Integration), and the store&#8217;s <code>error</code> callback only resets <code>loading</code>. This keeps every screen&#8217;s failure behavior identical without per-store plumbing.</p>
</div>
<div class="paragraph">
<p><strong>Idempotency keys.</strong> Money-moving and application-mutating calls (<code>confirmTransfer</code>, loan submit/modify/withdraw, loan repayment) carry an idempotency key so a retried request cannot execute twice on the BFF. The component owns the key. It lazily generates one with <code>crypto.randomUUID()</code> on first submit (<code>this.idempotencyKey ??= crypto.randomUUID()</code>) and reuses it on retries. It resets the key to <code>null</code> whenever the form value changes, because a changed form is a new operation, and clears it after success.</p>
</div>
<div class="paragraph">
<p><strong>Refresh on init.</strong> List screens re-fetch in their constructor (<code>loadAccounts()</code>, <code>loadHistory(0, size)</code>, &#8230;&#8203;) rather than caching across navigations. Stores clear the previous data signal at the start of each load so stale rows never flash. Pagination state (page, size, total elements, total pages) lives in the store next to the rows, mirroring the BFF&#8217;s page-response shape.</p>
</div>
<div class="paragraph">
<p><strong>Subscription cleanup.</strong> Every internal subscription is piped through <code>takeUntilDestroyed(this.destroyRef)</code> (an RxJS operator that unsubscribes automatically when the injecting component or service is destroyed), so neither stores nor components manage subscriptions by hand.</p>
</div>
</div>
<div class="sect3">
<h4 id="_the_authservice_exception">The AuthService exception</h4>
<div class="paragraph">
<p><code>core/auth/auth.service.ts</code> is intentionally not shaped like the feature stores, because the frontend never possesses the tokens. Both the access token and refresh token live in httpOnly cookies (cookies the browser attaches automatically but JavaScript cannot read), so there is nothing token-like to put in a signal. The service holds exactly one piece of state: a private <code>sessionExpiresAt</code> signal set from the BFF&#8217;s session response, with <code>isAuthenticated</code> as a <code>computed</code> over it. That computed value is what <code>authGuard</code> checks.</p>
</div>
<div class="paragraph">
<p>Its methods (<code>login</code>, <code>verifyTwoFactor</code>, <code>refresh</code>, <code>logout</code>) call the generated authentication client; the first three pass the device fingerprint as a typed parameter, while <code>logout</code> relies on the header the HTTP interceptor sets. <code>refresh()</code> additionally de-duplicates concurrent callers. An in-flight refresh is shared via <code>shareReplay(1)</code> and cleared in <code>finalize</code>, so the app initializer and the 401-retry path in the error interceptor never race two refresh requests. See <code>docs/consumer/security/</code> for the server side of this model.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="bff-integration">BFF Integration</h3>
<div class="sect3">
<h4 id="_the_generated_client">The generated client</h4>
<div class="paragraph">
<p>All HTTP traffic to the BFF goes through a machine-generated TypeScript client in <code>frontend/src/openapi-client/</code>, imported everywhere as <code>@bff/client</code> (a path alias mapped in <code>frontend/tsconfig.json</code>). It is organized as follows:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>api/</code> holds one Angular service per BFF controller (for example <code>savingsQueryController.service.ts</code>, <code>transfersCommandController.service.ts</code>), each extending the generated <code>BaseService</code> in <code>api.base.service.ts</code> and paired with a <code>*.serviceInterface.ts</code>. Method signatures are typed end to end: path, query, and header parameters plus the response DTO.</p>
</li>
<li>
<p><code>model/</code> holds one TypeScript interface per BFF DTO (<code>SavingsAccountQueryData</code>, <code>ConfirmTransferCommandRequest</code>, &#8230;&#8203;), with camelCased property names.</p>
</li>
<li>
<p><code>configuration.ts</code> defines the <code>Configuration</code> class holding the base path; the app provides it with <code>basePath: ''</code> so every request is relative (<code>/api/v1/&#8230;&#8203;</code>).</p>
</li>
<li>
<p><code>index.ts</code>, <code>encoder.ts</code>, <code>param.ts</code>, and <code>variables.ts</code> are plumbing. A generated <code>api.module.ts</code> also exists, but the app never imports it (services are <code>providedIn: 'root'</code>).</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>Because the client is generated, a BFF contract change shows up as a TypeScript compile error rather than a runtime surprise. One type is hand-written instead: <code>src/app/api/consumer-api-error.ts</code> defines the <code>ConsumerApiError</code> envelope (<code>code</code>, <code>defaultMessage</code>) that the BFF returns on failures. The envelope only ever appears as an error body, never as a declared response schema, so the generator does not emit it.</p>
</div>
</div>
<div class="sect3">
<h4 id="_how_the_client_is_generated">How the client is generated</h4>
<div class="paragraph">
<p>The generator runs on the BFF side, in <code>consumer/build.gradle</code>. The <code>generateTypescriptClient</code> task depends on the <code>openapi</code> task, which scrapes the spec from the running BFF at <code>/v3/api-docs</code> into <code>build/openapi/openapi.json</code>. It then runs OpenAPI Generator (<code>typescript-angular</code>) over that spec and writes into <code>frontend/src/openapi-client</code> with <code>npmName: '@bff/client'</code>, <code>withInterfaces</code>, <code>providedInRoot</code>, and <code>modelPropertyNaming: camelCase</code>. The frontend wraps it as an npm script:</p>
</div>
<div class="listingblock">
<div class="content">
<pre class="rouge highlight"><code data-lang="bash"><span class="nb">cd </span>frontend
npm run generate:client   <span class="c"># runs ../consumer's ./gradlew generateTypescriptClient</span></code></pre>
</div>
</div>
<div class="paragraph">
<p>Two operational rules follow from that design:</p>
</div>
<div class="ulist">
<ul>
<li>
<p>The Docker stack must be up, because the spec is scraped from the live application.</p>
</li>
<li>
<p>Delete the old output first (<code>rm -rf frontend/src/openapi-client</code>), because the generator does not remove files for endpoints that no longer exist; stale services would otherwise linger. The directory is generated output, so a failed run is fixed by re-running.</p>
</li>
</ul>
</div>
<div class="paragraph">
<p>The <code>e2e:docker:up</code> npm script regenerates the client automatically after bringing up the backend, before building the frontend image. See <code>docs/consumer/architecture/technology.adoc</code> for the full client-generation pipeline (the Java test client is generated from the same spec).</p>
</div>
</div>
<div class="sect3">
<h4 id="_dependency_injection_wiring">Dependency-injection wiring</h4>
<div class="paragraph">
<p><code>src/app/app.config.ts</code> wires the client into Angular&#8217;s dependency injection:</p>
</div>
<div class="ulist">
<ul>
<li>
<p><code>{ provide: Configuration, useValue: new Configuration({ basePath: '' }) }</code> overrides the generated default (<code><a href="http://localhost:8080" class="bare">http://localhost:8080</a></code> in <code>BaseService</code>) so all requests use relative URLs and inherit whatever origin served the app.</p>
</li>
<li>
<p><code>provideHttpClient(withInterceptors([errorInterceptor, authInterceptor]))</code> registers the two functional interceptors (plain functions that wrap every HTTP request, replacing the older class-based interceptor style).</p>
</li>
</ul>
</div>
</div>
<div class="sect3">
<h4 id="_the_interceptor_chain">The interceptor chain</h4>
<div class="paragraph">
<p>Interceptors run in registration order on the way out and reverse order on the way back, so <code>errorInterceptor</code> wraps <code>authInterceptor</code>. The fingerprint header is added last before the request leaves, and errors bubbling back pass through <code>errorInterceptor</code> last, where they are handled once for the whole app.</p>
</div>
<div class="paragraph">
<p><code>core/interceptors/auth.interceptor.ts</code> is minimal: for requests whose URL starts with <code>/api</code>, it clones the request and sets the <code>X-Device-Fingerprint</code> header from <code>deviceFingerprint()</code> (a per-browser UUID persisted in <code>localStorage</code>). It does not attach an <code>Authorization</code> header, because the access token travels in an httpOnly cookie that the browser attaches itself. The BFF verifies the header against the fingerprint claim baked into the token.</p>
</div>
<div class="paragraph">
<p><code>core/interceptors/error.interceptor.ts</code> centralizes failure handling. In order:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Condition</th>
<th class="tableblock halign-left valign-top">Behavior</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Request was to the audit endpoint or the refresh endpoint</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Rethrow untouched (prevents toast/refresh loops).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>403</code> with <code>ConsumerApiError</code> code <code>error.msg.consumer.auth.device.fingerprint.forbidden</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Device mismatch: record an <code>API_FAILURE</code> audit event, clear the session, navigate to <code>/login</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>401</code> without a <code>ConsumerApiError</code> code (an expired access token, not a policy denial)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Call <code>AuthService.refresh()</code> and transparently retry the original request once. If the retry still fails with <code>401</code>/<code>403</code>, clear the session and navigate to <code>/login</code>; a <code>429</code> on retry shows the rate-limit toast.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>429</code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Record <code>API_FAILURE</code> and show the translated rate-limited toast.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Anything else</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Record <code>API_FAILURE</code> and show a toast: the <code>ConsumerApiError</code> <code>code</code> is looked up in the i18n catalog; if untranslated, the server&#8217;s <code>defaultMessage</code> is shown; failing that, a generic error message.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>The <code>API_FAILURE</code> audit events record only a templated endpoint path (numeric and UUID segments replaced with <code>:id</code>) and the status code, never request or response bodies. This interceptor is why feature stores hold no error state (see State Management).</p>
</div>
</div>
<div class="sect3">
<h4 id="_base_path_resolution_per_environment">Base path resolution per environment</h4>
<div class="paragraph">
<p>Since the client&#8217;s base path is <code>''</code>, requests go to <code>/api/&#8230;&#8203;</code> on the current origin, and each environment routes that to the BFF:</p>
</div>
<table class="tableblock frame-all grid-all stretch">
<colgroup>
<col>
<col>
<col>
</colgroup>
<thead>
<tr>
<th class="tableblock halign-left valign-top">Environment</th>
<th class="tableblock halign-left valign-top">Origin</th>
<th class="tableblock halign-left valign-top">How <code>/api</code> reaches the BFF</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Dev server (<code>ng serve</code>)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code><a href="http://localhost:4200" class="bare">http://localhost:4200</a></code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>frontend/proxy.conf.json</code> (wired via <code>proxyConfig</code> in <code>angular.json</code>) forwards <code>/api</code> to <code><a href="http://localhost:8080" class="bare">http://localhost:8080</a></code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Containerized stack (e2e / demo)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code><a href="http://localhost:4443" class="bare">http://localhost:4443</a></code></p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock"><code>frontend/nginx.conf</code> in the frontend image proxies <code>location /api/</code> to <code><a href="http://bff:8080/api/" class="bare">http://bff:8080/api/</a></code>, adding <code>X-Forwarded-*</code> headers; every other path falls through to the static Angular bundle (<code>try_files &#8230;&#8203; /index.html</code>).</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Relative URLs keep the httpOnly auth cookies same-origin in both setups: the browser never makes a cross-origin call, so no CORS configuration is needed on the BFF for the app itself.</p>
</div>
</div>
</div>
<div class="sect2">
<h3 id="_technology_stack">Technology Stack</h3>
<div class="sect3">
<h4 id="_runtime_and_tooling">Runtime and tooling</h4>
<div class="paragraph">
<p>Versions below are taken from <code>frontend/package.json</code> (declared ranges) and <code>frontend/angular.json</code>. The app requires Node 22 (<code>engines</code>) and is built with the Angular CLI (<code>@angular/build</code>).</p>
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
<th class="tableblock halign-left valign-top">What it is and why it is here</th>
</tr>
</thead>
<tbody>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Angular</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">22.0.1</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The application framework. Standalone, signal-based APIs; no NgModules anywhere in application code.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">TypeScript</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">~6.0.3</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Typed JavaScript. <code>strict: true</code> plus Angular&#8217;s <code>strictTemplates</code>/<code>strictInjectionParameters</code> in <code>tsconfig.json</code>, so template bindings are type-checked against the generated DTOs.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Ionic (<code>@ionic/angular</code>) + ionicons</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">8.8.16 / 8.1.0</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The UI component library (cards, inputs, toolbars, split pane, toasts, progress bars), used via its standalone component exports. It was chosen over a bespoke design system because a ready-made component library covers the app&#8217;s UI needs.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Angular CDK</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">22.0.2</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">The Component Dev Kit, a headless behavior library from the Angular team. Only <code>CdkTableModule</code> is used, for the data tables on list and detail screens.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">ngx-translate (+ http-loader)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">18.0.0</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Runtime internationalization. Translations load from <code>/i18n/*.json</code>; BFF error codes are resolved through the same catalog, so no user-facing English is hardcoded.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">zone.js</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">0.16.2</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Angular&#8217;s change-detection trigger, registered via <code>provideZoneChangeDetection()</code> in <code>app.config.ts</code>. It is retained as a compatibility concession to Ionic v8&#8217;s internals; application code is written signal-first so it does not depend on it.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">RxJS</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">7.8</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Observable streams; used for HTTP responses and router events, always cleaned up with <code>takeUntilDestroyed</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Vitest</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">4.1.9</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Unit test runner, wired through the <code>@angular/build:unit-test</code> builder (<code>runner: vitest</code> in <code>angular.json</code>), with <code>jsdom</code> as the DOM. Run with <code>npm test</code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Playwright</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">1.60.0</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Browser end-to-end tests in <code>frontend/playwright/</code>, run against the full Docker stack (<code>npm run e2e:stack:run</code>) at <code><a href="http://localhost:4443" class="bare">http://localhost:4443</a></code>.</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">ESLint (+ angular-eslint, typescript-eslint)</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">10.6.0 / 22.1.0 / 8.62.1</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Linting for TypeScript and Angular templates (<code>npm run lint</code>).</p></td>
</tr>
<tr>
<td class="tableblock halign-left valign-top"><p class="tableblock">Prettier</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">3.9.6</p></td>
<td class="tableblock halign-left valign-top"><p class="tableblock">Code formatting; configured inline in <code>package.json</code> (100-column width, single quotes, Angular parser for HTML). CI checks <code>format:check</code>.</p></td>
</tr>
</tbody>
</table>
<div class="paragraph">
<p>Two build-adjacent pieces round out the picture: the generated <code>@bff/client</code> (see BFF Integration) and the production Docker image, which compiles the bundle and serves it from nginx (<code>frontend/Dockerfile</code>, <code>frontend/nginx.conf</code>).</p>
</div>
</div>
<div class="sect3">
<h4 id="_idioms_in_use">Idioms in use</h4>
<div class="paragraph">
<p>These are the codebase-wide conventions; each holds for the entire <code>src/app/</code> tree.</p>
</div>
<div class="ulist">
<ul>
<li>
<p><strong>Standalone components only.</strong> There is not a single <code>@NgModule</code> in application code (the generated client ships an unused <code>api.module.ts</code>). Components list their dependencies in the <code>imports</code> array of <code>@Component</code>, and <code>standalone: true</code> is never written because it is the default.</p>
</li>
<li>
<p><strong>Signals and <code>computed</code> for state.</strong> All state, both store data and component UI state such as wizard steps and loading flags, lives in <code>signal()\`s, with \`computed()</code> for derived values (for example the destination-account options in the transfer form). See State Management.</p>
</li>
<li>
<p><strong>Native control flow.</strong> Templates use the built-in control-flow syntax (<code>@if</code>, <code>@for</code>, <code>@switch</code>) exclusively; no template uses the <code>*ngIf</code>/<code>*ngFor</code> structural directives.</p>
</li>
<li>
<p><strong><code>inject()</code> over constructor parameters.</strong> Dependencies are obtained with the <code>inject()</code> function in field initializers; no class uses constructor-parameter injection.</p>
</li>
<li>
<p><strong>Functional guards and interceptors.</strong> <code>authGuard</code> is a <code>CanActivateFn</code> and both interceptors are <code>HttpInterceptorFn\`s: plain functions registered in \`app.config.ts</code>, not classes.</p>
</li>
<li>
<p><strong>Lazy loading everywhere.</strong> Every route uses <code>loadComponent</code> or <code>loadChildren</code>; no feature code is in the initial bundle beyond the shell and core singletons.</p>
</li>
<li>
<p><strong><code>OnPush</code> change detection.</strong> Every component except the root <code>App</code> declares <code>ChangeDetectionStrategy.OnPush</code> (Angular only re-renders it when a signal it reads changes or one of its bound events fires); the root component is a bare <code>&lt;router-outlet&gt;</code>.</p>
</li>
<li>
<p><strong>Generated typed client, no hand-written HTTP.</strong> No application code calls <code>HttpClient</code> directly; BFF calls go through <code>@bff/client</code> services and their DTOs, and <code>any</code> is banned by lint and strict typing. Two deliberate exceptions exist. <code>core/audit/audit.service.ts</code> posts audit batches with the browser&#8217;s raw <code>fetch</code> and <code>keepalive: true</code> so a batch can still be delivered while the tab is closing; even that service builds the request body from generated <code>@bff/client</code> DTO types. The consent screen (<code>features/consent/consent.component.ts</code>) submits native HTML forms to the OAuth2 authorization endpoint, because the decision must land there as a normal browser navigation so the BFF can answer with the redirect back to the third party.</p>
</li>
</ul>
</div>
</div>
</div>
</div>
`;export{e as default};