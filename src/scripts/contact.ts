/**
 * Contact form (`/contact`).
 *
 * The form is a real `<form>` with labelled fields, so it is complete and
 * valid without this module; what the script adds is asynchronous submission
 * with an accessible status message, a busy state on the submit button and
 * field-level error surfacing from `/api/contact`.
 */

import { $, ready } from "./lib/dom"

interface ContactPayload {
  name: string
  email: string
  phone: string
  comment: string
}

/** Copy comes from the form itself so it stays translatable. */
function copy(form: HTMLFormElement, key: string): string {
  return form.getAttribute(`data-i18n-${key}`) || ""
}

function setMessage(el: HTMLElement | null, text: string, tone: "success" | "error"): void {
  if (!el) return
  el.textContent = text
  el.dataset.tone = tone
  el.hidden = !text
  // `role` is static in the markup (status/alert); re-announcing needs a nudge.
  el.setAttribute("aria-atomic", "true")
}

function setBusy(button: HTMLButtonElement | null, busy: boolean, label: string): void {
  if (!button) return
  button.disabled = busy
  button.classList.toggle("is-busy", busy)
  button.setAttribute("aria-busy", String(busy))
  if (busy) {
    button.dataset.label = button.textContent || ""
    button.textContent = label
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label
  }
}

async function submit(form: HTMLFormElement): Promise<void> {
  const message = $<HTMLElement>("[data-contact-message]", form)
  const button = $<HTMLButtonElement>("[data-contact-submit]", form)
  const data = new FormData(form)
  const payload: ContactPayload = {
    name: String(data.get("name") || "").trim(),
    email: String(data.get("email") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    comment: String(data.get("comment") || "").trim(),
  }

  setBusy(button, true, copy(form, "sending") || "Sending…")
  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    })
    const body = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setMessage(message, body.error || copy(form, "error") || "Could not send.", "error")
      return
    }
    setMessage(message, copy(form, "success") || "Thanks — we'll reply shortly.", "success")
    form.reset()
    $<HTMLInputElement>("[name='name']", form)?.focus()
  } catch {
    setMessage(message, copy(form, "network") || "Network error. Please try again.", "error")
  } finally {
    setBusy(button, false, "")
  }
}

function init(): void {
  const form = $<HTMLFormElement>("[data-contact-form]")
  if (!form) return
  form.addEventListener("submit", (event) => {
    event.preventDefault()
    void submit(form)
  })
}

ready(init)
