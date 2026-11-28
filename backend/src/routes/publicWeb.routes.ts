import { Router, type Request, type Response } from "express";

const router = Router();

function renderPage(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} | MyQuro</title>
  <style>
    :root { --bg:#0d0d0f; --card:#17181c; --text:#f4f4f5; --muted:#a1a1aa; --gold:#eab308; --border:#27272a; }
    * { box-sizing:border-box; }
    body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; background:var(--bg); color:var(--text); line-height:1.6; }
    header { border-bottom:1px solid var(--border); padding:18px 24px; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; max-width:960px; margin:0 auto; }
    .brand { font-weight:800; font-size:20px; letter-spacing:0.5px; color:var(--gold); text-decoration:none; }
    nav { display:flex; flex-wrap:wrap; gap:14px; font-size:14px; }
    nav a { color:var(--muted); text-decoration:none; }
    nav a:hover { color:var(--text); }
    main { max-width:960px; margin:0 auto; padding:28px 24px 64px; }
    .hero { background:var(--card); border:1px solid var(--border); border-radius:16px; padding:28px; margin-bottom:24px; }
    h1 { margin:0 0 10px; font-size:28px; }
    h2 { margin:24px 0 8px; font-size:20px; color:var(--gold); }
    p, li { color:#d4d4d8; }
    .grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:16px; margin-top:18px; }
    .card { background:var(--card); border:1px solid var(--border); border-radius:12px; padding:18px; }
    footer { border-top:1px solid var(--border); max-width:960px; margin:0 auto; padding:20px 24px; font-size:13px; color:var(--muted); display:flex; flex-wrap:wrap; gap:14px; justify-content:space-between; }
    footer a { color:var(--muted); }
  </style>
</head>
<body>
  <header>
    <a class="brand" href="/website">MYQURO</a>
    <nav>
      <a href="/website">Home</a>
      <a href="/privacy-policy">Privacy</a>
      <a href="/terms-and-conditions">Terms</a>
      <a href="/refund-policy">Refund &amp; Cancellation</a>
      <a href="/shipping-delivery-policy">Delivery Policy</a>
      <a href="/contact">Contact</a>
    </nav>
  </header>
  <main>${bodyHtml}</main>
  <footer>
    <span>© ${new Date().getFullYear()} MyQuro Food Technologies. All rights reserved.</span>
    <span>
      <a href="/privacy-policy">Privacy Policy</a> ·
      <a href="/terms-and-conditions">Terms &amp; Conditions</a> ·
      <a href="/refund-policy">Refund Policy</a> ·
      <a href="/contact">Contact Us</a>
    </span>
  </footer>
</body>
</html>`;
}

export const homeHtml = renderPage(
  "Hyperlocal Food Delivery & Dine-Out",
  `<section class="hero">
    <h1>MyQuro — Honest Hyperlocal Food Delivery &amp; Dine-Out</h1>
    <p>MyQuro connects local restaurants, diners, and delivery partners across India with strict dine-in menu price parity, instant QR table ordering, and fast doorstep delivery.</p>
  </section>
  <div class="grid">
    <div class="card">
      <h2>Customer App</h2>
      <p>Browse neighborhood restaurants at dine-in menu prices, pay online via UPI/Cards/Netbanking powered by Razorpay or Cash on Delivery, and track deliveries live.</p>
    </div>
    <div class="card">
      <h2>Restaurant Partners</h2>
      <p>Manage live menus, table QR sessions, kitchen display orders, and transparent 12% partner commissions with timely payouts.</p>
    </div>
    <div class="card">
      <h2>Delivery Partners</h2>
      <p>Real-time order dispatch, fair distance-based earnings, and seamless UPI cash settlement tracking.</p>
    </div>
  </div>
  <section class="card" style="margin-top:20px;">
    <h2>Pricing &amp; Billing Transparency</h2>
    <p>All food items on MyQuro are listed strictly at or below each partner restaurant&apos;s dine-in menu price. Delivery charges, GST (5%), and any applicable small-order fee are displayed upfront before payment in INR.</p>
  </section>`
);

router.get("/website", (_req: Request, res: Response) => {
  res.status(200).type("html").send(homeHtml);
});

router.get("/privacy-policy", (_req: Request, res: Response) => {
  res.status(200).type("html").send(
    renderPage(
      "Privacy Policy",
      `<h1>Privacy Policy</h1>
      <p>MyQuro collects only the information required to fulfill food delivery, table dine-in orders, and partner settlements, including name, phone number, delivery address/GPS coordinates, and order history.</p>
      <h2>Payment Data</h2>
      <p>Online payments (UPI, Cards, Netbanking, Wallets) are processed securely via Razorpay. MyQuro does not store your raw card numbers, CVV, or UPI PIN.</p>
      <h2>Data Usage &amp; Deletion</h2>
      <p>Contact <a href="/contact" style="color:#eab308;">MyQuro Support</a> to request account data correction or deletion.</p>`
    )
  );
});

router.get("/terms-and-conditions", (_req: Request, res: Response) => {
  res.status(200).type("html").send(
    renderPage(
      "Terms & Conditions",
      `<h1>Terms &amp; Conditions</h1>
      <p>By placing an order or settling partner dues through MyQuro mobile applications, you agree to these terms:</p>
      <ul>
        <li>Orders are prepared and fulfilled by participating local restaurant partners.</li>
        <li>Prices are displayed in Indian Rupees (INR) with applicable taxes shown before checkout confirmation.</li>
        <li>MyQuro acts as an online food ordering, dine-out billing, and delivery facilitation platform.</li>
      </ul>`
    )
  );
});

router.get("/refund-policy", (_req: Request, res: Response) => {
  res.status(200).type("html").send(
    renderPage(
      "Refund & Cancellation Policy",
      `<h1>Refund &amp; Cancellation Policy</h1>
      <ul>
        <li>Orders cancelled before restaurant acceptance or preparation begins are eligible for a 100% refund to the original payment method via Razorpay within 5–7 business days.</li>
        <li>Orders declined by the restaurant or undeliverable due to partner/platform issues trigger automatic full refunds.</li>
        <li>Once food preparation starts, cancellations may not be eligible for refund except for verified missing/damaged item claims via in-app support.</li>
      </ul>`
    )
  );
});

router.get("/shipping-delivery-policy", (_req: Request, res: Response) => {
  res.status(200).type("html").send(
    renderPage(
      "Shipping & Delivery Policy",
      `<h1>Shipping &amp; Delivery Policy</h1>
      <p>MyQuro fulfills local restaurant food orders through hyperlocal delivery partners within serviceable city zones (typically 25–45 minutes depending on distance and restaurant prep time).</p>
      <p>Live delivery partner status and tracking are available inside the MyQuro Customer App immediately after order confirmation.</p>`
    )
  );
});

router.get("/contact", (_req: Request, res: Response) => {
  res.status(200).type("html").send(
    renderPage(
      "Contact Us",
      `<h1>Contact MyQuro Support</h1>
      <div class="card">
        <p><strong>Platform:</strong> MyQuro Food Delivery &amp; Dine-Out Platform</p>
        <p><strong>Service Region:</strong> Bhubaneswar, Odisha, India</p>
        <p><strong>Support Email:</strong> support@myquro.in</p>
        <p><strong>Support Hours:</strong> 9:00 AM – 11:30 PM IST (Daily)</p>
      </div>`
    )
  );
});

export default router;
