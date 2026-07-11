# Stripe Integration & Connection Guide

This guide walks you through the step-by-step setup required to connect your Simple POS project with Stripe. The codebase is already fully wired to support credit card and PromptPay payments; you only need to obtain your Stripe keys, configure the environment variables, and set up a local webhook listener.

---

## 1. Retrieve Stripe API Keys
1. Sign up or log in to the [Stripe Dashboard](https://dashboard.stripe.com).
2. Switch on **Test Mode** (toggle in the top-right corner) to prevent real charges during development.
3. Navigate to **Developers** > **API keys**.
4. Copy the following keys:
   - **Publishable key** (starts with `pk_test_...`)
   - **Secret key** (starts with `sk_test_...`)

---

## 2. Configure Environment Variables
Open the [.env](file:///home/bank/simple_pos_/.env) file at the root of your project and populate the Stripe keys:

```env
# Stripe Keys (Test Mode)
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Public URL of the app (used for Stripe redirects/return_url)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

> [!NOTE]
> The server-side Stripe instance is loaded in [stripe.ts](file:///home/bank/simple_pos_/lib/stripe.ts) using `STRIPE_SECRET_KEY`.
> The client-side Stripe component loader is loaded in [stripe-client.ts](file:///home/bank/simple_pos_/lib/stripe-client.ts) using `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.

---

## 3. Set Up Local Webhook Listener
Since local servers are not accessible to public networks, Stripe cannot directly send webhook notifications (e.g., confirming a successful payment) to your local backend. To fix this, use the Stripe CLI to tunnel events locally.

### Setup Steps:
1. **Install Stripe CLI** on your development machine (Linux/macOS/Windows).
   - E.g., on Debian/Ubuntu:
     ```bash
     curl -s https://packages.stripe.dev/strp-cli-gpg-pub | gpg --dearmor | sudo tee /usr/share/keyrings/stripe.gpg
     echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | sudo tee /etc/apt/sources.list.d/stripe.list
     sudo apt-get update
     sudo apt-get install stripe
     ```
2. **Log in to Stripe CLI**:
   ```bash
   stripe login
   ```
   *This opens a browser tab requesting permissions to link the CLI tool with your account.*
3. **Listen and Forward Events**:
   Start forwarding Stripe webhook events to your local API route handler at `/api/webhooks/stripe`:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. **Obtain Webhook Signing Secret**:
   The `stripe listen` command output will print a webhook signing secret (looks like `whsec_...`):
   ```
   Ready! Your webhook signing secret is whsec_xxx...
   ```
5. **Update [.env](file:///home/bank/simple_pos_/.env)**:
   Add this secret to your [.env](file:///home/bank/simple_pos_/.env) file:
   ```env
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

> [!IMPORTANT]
> Keep the Stripe CLI terminal tab running while testing. Webhooks are the sole source of truth in this project for changing a transaction status from `pending` to `paid` and decrementing database inventory stock.

---

## 4. Enable PromptPay Payments (Thailand QR Code)
If you want to offer **PromptPay** (which surfaces a dynamic QR code for customers to scan using Thai banking apps):
1. Navigate to **Settings** > **Payment methods** in your Stripe Dashboard.
2. Select your platform configuration or active settings group.
3. Ensure that your Stripe account is configured for **Thailand** as the business country, or supports multi-currency THB transactions.
4. Locate **PromptPay** and toggle it to **Enabled** (or "Default on").
5. Because the backend route [POST](file:///home/bank/simple_pos_/app/api/payment-intent/route.ts#L62-L135) sets `automatic_payment_methods: { enabled: true }`, Stripe will automatically render PromptPay in the embedded checkout UI if the user currency is THB.

---

## 5. Test the Checkout Flow
1. Start your local server:
   ```bash
   npm run dev
   ```
2. Open your browser to `http://localhost:3000/cashier`.
3. Add items to the cart and click **Pay now** (which triggers the API in [route.ts](file:///home/bank/simple_pos_/app/api/payment-intent/route.ts) to create a Stripe PaymentIntent).
4. The client [CheckoutForm](file:///home/bank/simple_pos_/components/checkout-form.tsx#L65-L76) will render.
5. In **Test Mode**, enter Stripe's test payment card numbers:
   - **Successful Payment**: Use `4242 4242 4242 4242` with any future expiry date and a random CVC.
   - **3D Secure (Requires Auth)**: Use `4000 0027 6000 3184` to trigger a simulated SMS/OTP popup.
   - **Declined Card**: Use `4000 0000 0000 0002` to test error banner displays.
6. Verify your local terminal running the Stripe CLI: it should output logs for `payment_intent.succeeded` when a successful payment is confirmed.
7. Go to `/transactions` in your POS UI to confirm that the transaction is marked as **paid** and that the products have had their inventory decremented successfully.
