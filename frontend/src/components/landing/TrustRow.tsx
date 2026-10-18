export function TrustRow() {
  return <div className="trust-row anim" style={{ "--d": "0.06s" }} aria-describedby="landing-demo-note">
    <div className="trust-avatars" aria-hidden="true">{["microsoft", "amazon", "google"].map((brand) => <span className="trust-avatar" key={brand}><span><i className={`fa-brands fa-${brand}`} /></span></span>)}</div>
    <span className="trust-pill">Trusted by 2000+ Enterprises</span>
  </div>;
}
