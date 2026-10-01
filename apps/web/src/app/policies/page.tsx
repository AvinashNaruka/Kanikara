const policies = [
  ['Terms of Service', 'By using Kanikara\'s website and placing an order, you agree to these terms. Product images and descriptions are shown as accurately as possible, but slight variations in colour, weight, or finish may occur due to the handmade nature of jewellery. Prices are subject to change without notice. We reserve the right to cancel any order at our discretion, in which case a full refund will be issued. Misuse of the site, coupons, or payment systems may result in order cancellation or account suspension. These terms are governed by the laws of India.'],
  ['Privacy Policy', 'We collect your name, phone number, email, and delivery address only to process your orders and communicate with you about them. Payment details are handled directly by our payment partner (PayU) and are never stored on our servers. We do not sell or share your personal information with third parties, except as required to fulfil your order (e.g., courier partners) or by law. You may request access to or deletion of your data by contacting us.'],
  ['Shipping Policy', 'Orders are usually dispatched within 2–5 business days. Delivery timelines vary by location and are shown at checkout where possible. Shipping is free on all orders unless stated otherwise. Once your order ships, you\'ll be able to track it from your account under "My Orders." We are not responsible for delays caused by courier partners, weather, or circumstances beyond our control.'],
  ['Cancellation & Refund Policy', 'Orders can be cancelled before they are dispatched — contact us as soon as possible if you wish to cancel. Once dispatched, cancellation is not guaranteed. Unworn, undamaged jewellery in its original packaging can be returned within 15 days of delivery for a refund or exchange — please contact us within this window to initiate a return. For prepaid orders that are cancelled or returned, refunds are processed to the original payment method within 7–10 business days. Made-to-order or customised pieces cannot be returned or cancelled once production has started, unless the piece arrives damaged or defective.'],
];

export default function PoliciesPage() {
  return (
    <>
      <div className="page-head"><h1 className="h-section">Policies</h1></div>
      <div className="wrap" style={{ padding: '44px var(--pad) 90px', maxWidth: 820 }}>
        {policies.map(([title, body]) => (
          <section key={title}>
            <h2 className="h-section" style={{ fontSize: 24, marginBottom: 12 }}>{title}</h2>
            <p className="lede-light" style={{ maxWidth: 'none', marginBottom: 36 }}>{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}
