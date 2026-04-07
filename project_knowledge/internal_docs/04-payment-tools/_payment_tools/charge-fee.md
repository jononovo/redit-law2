Hey, you know how we received the credit card information and then we encrypt it and we don't actually store it and we send it back to the bot?

Well, what I'd like to do at the same time is authorize with stripe on the same credit card so that we can take a commission, of for example 0.05% of every sale.

And at the end of the month, we would just take 0.05% or something like that. Or perhaps every time it reaches a certain threshold.

But it wouldn't be a monthly subscription.

Does that make sense?

You know, we capture the details of the credit card in the on boarding, and I was wondering if we could send those details along with the customer name and everything to stripe at the same time that we're capturing it for the encryption.

Can you also look at the on boarding flow for a new card in rail5, because that is the most updated on boarding flow, that we will actually use for that cause.

Does that make sense?

Don't change anything yet

Yes, that makes sense! You want to leverage the moment when you're already capturing the credit card details during onboarding to also create a Stripe authorization, so you can later charge a commission (like 0.05% of each sale) without needing the card details again. Smart approach.

Let me look at the current codebase and the onboarding flow to understand exactly how card capture works today, so I can give you a solid answer on how to integrate Stripe alongside it.

Great, I now have a clear picture. Here's what I've found and my thoughts on your question:

How Card Capture Works Today (Rail 5)
In the Rail 5 onboarding flow, the card details (PAN, CVV, expiry, name, billing address) are entered by the user in the browser. Before anything leaves the browser:

The browser encrypts the card data using AES-256-GCM
The encryption key is sent to your server (stored in rail5_cards)
An encrypted Markdown file (containing the ciphertext + a decrypt script) is built and delivered to the bot
The server never sees the plaintext card details — that's the whole point of the split-knowledge model
The Stripe Integration Idea
What you're describing is essentially: at the same moment the user enters their card in the browser during onboarding, also send those details to Stripe to create a Stripe Customer + PaymentMethod (or SetupIntent). This would let you:

Store a Stripe token (not the raw card) for that customer
Later charge the commission (e.g., 0.05% of each sale) by creating a PaymentIntent against that saved payment method
Charge either when a threshold is hit, or on a schedule — not as a subscription, but as usage-based billing
This is absolutely doable. Here's why it works well:
The card details are already in the browser in plaintext (briefly, before encryption). That's the perfect moment to also pass them to Stripe via Stripe Elements or a SetupIntent flow
Stripe would tokenize the card on their end (PCI-compliant), giving you back a payment_method_id and customer_id to store in your database
You'd never store the raw card — Stripe handles that
The two operations (encrypt for bot + tokenize for Stripe) happen in parallel in the browser during the same onboarding step
How the commission charging would work:
During onboarding: Create a Stripe Customer and attach a PaymentMethod via a SetupIntent (this authorizes the card for future charges)
On each bot purchase: Record the transaction amount, calculate 0.05% commission, and accumulate it
When threshold is reached (or end of billing period): Create a PaymentIntent for the accumulated commission amount against the saved PaymentMethod
Things to think about:
User consent: You'd want to clearly tell the user during onboarding that their card will also be used for commission charges
Threshold vs. time-based: Do you want to charge when the accumulated commission hits, say, $10? Or on a fixed schedule? Or both (whichever comes first)?
The commission rate: 0.05% is quite small — on a $100 purchase that's $0.05. Stripe's own processing fee ($0.30 + 2.9%) would eat into very small charges, so a threshold-based approach makes more sense than per-transaction charging
Want me to go ahead and build this out, or would you like to nail down the specifics (commission rate, threshold amount, etc.) first?

