import { useState } from "react";

export default function Feedback() {
  const [status, setStatus] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("sending");
    const form = e.target;
    const data = new FormData(form);

    try {
      const res = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: data,
      });
      const json = await res.json();
      if (json.success) {
        setStatus("success");
        form.reset();
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  return (
    <>
      <style>{`
        .contact-section {
          width: 100%;
          max-width: 40rem;
          margin-left: auto;
          margin-right: auto;
          padding: 3rem 1rem;
        }
        .contact-intro > * + * {
          margin-top: 1rem;
        }
        .contact-title {
          font-size: 1.875rem;
          line-height: 2.25rem;
          font-weight: 700;
          color: #f1f0f5;
        }
        .contact-description {
          color: rgb(107 114 128);
        }
        .form-group-container {
          display: grid;
          gap: 1rem;
          margin-top: 2rem;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .form-label {
          margin-bottom: 0.5rem;
          color: #9d9ab0;
          font-size: 0.875rem;
        }
        .form-input,
        .form-textarea {
          padding: 0.5rem;
          border: 1px solid #2e2a3d;
          background: #1a1425;
          color: #f1f0f5;
          display: flex;
          height: 2.5rem;
          width: 100%;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          line-height: 1.25rem;
          box-sizing: border-box;
          transition: border-color 180ms;
        }
        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #6b7280;
        }
        .form-input:focus,
        .form-textarea:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 0 0 2px rgba(124,58,237,0.2);
        }
        .form-textarea {
          height: auto;
          min-height: 120px;
          resize: vertical;
        }
        .form-submit {
          width: 100%;
          margin-top: 1.2rem;
          background-color: #7c3aed;
          color: #fff;
          padding: 13px 5px;
          border-radius: 0.375rem;
          border: none;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: background 180ms, box-shadow 180ms;
        }
        .form-submit:hover:not(:disabled) {
          background-color: #6d28d9;
          box-shadow: 0 0 16px rgba(124,58,237,0.5);
        }
        .form-submit:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .form-success {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          background: rgba(124,58,237,0.15);
          border: 1px solid rgba(124,58,237,0.3);
          color: #a78bfa;
          font-size: 0.875rem;
          text-align: center;
        }
        .form-error {
          margin-top: 1rem;
          padding: 0.75rem 1rem;
          border-radius: 0.375rem;
          background: rgba(220,38,38,0.1);
          border: 1px solid rgba(220,38,38,0.3);
          color: #f87171;
          font-size: 0.875rem;
          text-align: center;
        }
      `}</style>

      <section className="contact-section">
        <div className="contact-intro">
          <h2 className="contact-title">Feedback</h2>
          <p className="contact-description">
            Fill out the form below and we'll get back to you as soon as possible.
          </p>
        </div>

        <form className="contact-form" onSubmit={handleSubmit}>
          <input type="hidden" name="access_key" value="YOUR_ACCESS_KEY_HERE" />
          <input type="hidden" name="subject" value="New Contact Form Submission" />
          <input type="hidden" name="from_name" value="My Website" />

          <div className="form-group-container">
            <div className="form-group">
              <label htmlFor="name" className="form-label">Name</label>
              <input id="name" name="name" className="form-input" placeholder="Your name" type="text" required />
            </div>

            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <input id="email" name="email" className="form-input" placeholder="Your email" type="email" required />
            </div>

            <div className="form-group">
              <label htmlFor="message" className="form-label">Message</label>
              <textarea className="form-textarea" id="message" name="message" placeholder="Your message" required />
            </div>
          </div>

          <button className="form-submit" type="submit" disabled={status === "sending"}>
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <div className="form-success">✓ Message sent successfully! We'll get back to you soon.</div>
          )}
          {status === "error" && (
            <div className="form-error">✕ Something went wrong. Please try again.</div>
          )}
        </form>
      </section>
    </>
  );
}