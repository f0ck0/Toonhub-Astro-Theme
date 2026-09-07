/**
 * Newsletter signup: tries Medusa (three endpoint shapes across versions), then
 * falls back to our own `/api/newsletter` route which persists locally when the
 * backend has no subscriber route.
 *
 * Copy arrives through the form's server-rendered `data-messages` attribute, so
 * this module contains no user-facing strings.
 */
import { config } from "./lib/config"

/**
 * Newsletter: try Medusa first (three possible endpoint shapes across
 * versions), then our own `/api/newsletter` route which persists locally when
 * the backend has no subscriber route. Copy comes from the server-rendered
 * `data-messages` attribute, so this script contains no user-facing strings.
 */
const form = document.querySelector<HTMLFormElement>("[data-newsletter-form]")

if (form) {
  const submit = form.querySelector<HTMLButtonElement>("[data-newsletter-submit]")
  const message = document.getElementById("newsletterMsg")
  const messages = JSON.parse(form.dataset.messages || "{}") as Record<string, string>

  const show = (tone: "success" | "error", text: string) => {
    if (!message) return
    message.hidden = false
    message.dataset.tone = tone
    message.textContent = text
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault()
    const input = form.querySelector<HTMLInputElement>('input[name="email"]')
    const email = input?.value.trim() || ""
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)

    if (!valid) {
      show("error", messages.invalid || "Please enter a valid email.")
      input?.focus()
      return
    }

    if (submit) {
      submit.disabled = true
      submit.setAttribute("aria-busy", "true")
    }

    try {
      const { baseUrl, publishableKey } = config()
      if (baseUrl) {
        const paths = ["/store/newsletter-subscribers", "/store/subscribers", "/store/newsletter"]
        for (const path of paths) {
          try {
            const res = await fetch(`${baseUrl}${path}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                ...(publishableKey ? { "x-publishable-api-key": publishableKey } : {}),
              },
              body: JSON.stringify({ email }),
              signal: AbortSignal.timeout(6000),
            })
            if (res.ok || res.status === 409) {
              show("success", messages.success || "Thanks — you're on the list.")
              form.reset()
              return
            }
          } catch {
            /* try the next shape */
          }
        }
      }

      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
        signal: AbortSignal.timeout(8000),
      })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (res.ok) {
        show("success", messages.success || "Thanks — you're on the list.")
        form.reset()
      } else {
        show("error", data.error || messages.error || "Could not subscribe. Try again.")
      }
    } catch {
      show("error", messages.network || "Network error. Please try again.")
    } finally {
      if (submit) {
        submit.disabled = false
        submit.removeAttribute("aria-busy")
      }
    }
  })
}
