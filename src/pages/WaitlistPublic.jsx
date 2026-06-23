import React, { useState } from "react";

export default function WaitlistPublic() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    company_name: "",
    phone: "",
  });
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [errorMsg, setErrorMsg] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg("");
    try {
      const res = await fetch("/api/waitlist-public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong.");
    }
  };

  if (status === "success") {
    return (
      <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "system-ui" }}>
        <h1 style={{ fontSize: 24, marginBottom: 12 }}>You're on the list</h1>
        <p>
          Thanks, {form.full_name || "friend"} — we'll email {form.email} once your access is approved.
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "80px auto", padding: 24, fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Request early access</h1>
      <p style={{ color: "#555", marginBottom: 24 }}>
        Tell us a bit about you and we'll send a sign-in link once approved.
      </p>
      <form onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Full name</span>
          <input
            name="full_name"
            value={form.full_name}
            onChange={onChange}
            required
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Email</span>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            required
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Company</span>
          <input
            name="company_name"
            value={form.company_name}
            onChange={onChange}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span>Phone</span>
          <input
            name="phone"
            value={form.phone}
            onChange={onChange}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 6 }}
          />
        </label>
        <button
          type="submit"
          disabled={status === "submitting"}
          style={{
            padding: "10px 16px",
            background: "#111",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {status === "submitting" ? "Submitting…" : "Request access"}
        </button>
        {status === "error" && <p style={{ color: "#b00020" }}>{errorMsg}</p>}
      </form>
    </div>
  );
}
