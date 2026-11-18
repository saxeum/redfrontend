import { useEffect, useRef, useState } from "react"

const SCRIPT_ID = "google-identity-services"
const SCRIPT_SRC = "https://accounts.google.com/gsi/client"

let scriptPromise: Promise<void> | null = null

const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve()
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true })
      existing.addEventListener(
        "error",
        () => {
          existing.remove()
          scriptPromise = null
          reject(new Error("Google Identity Services failed to load"))
        },
        { once: true },
      )
      return
    }

    const script = document.createElement("script")
    script.id = SCRIPT_ID
    script.src = SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => {
      script.remove()
      scriptPromise = null
      reject(new Error("Google Identity Services failed to load"))
    }
    document.head.appendChild(script)
  })

  return scriptPromise
}

interface GoogleSignInButtonProps {
  clientId: string
  disabled?: boolean
  onCredential: (idToken: string) => void
}

const GoogleSignInButton = ({
  clientId,
  disabled = false,
  onCredential,
}: GoogleSignInButtonProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const callbackRef = useRef(onCredential)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    callbackRef.current = onCredential
  }, [onCredential])

  useEffect(() => {
    let cancelled = false
    setError(null)

    loadGoogleScript()
      .then(() => {
        if (cancelled) return
        if (!containerRef.current || !window.google) {
          setError("Google sign-in is unavailable right now.")
          return
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response.credential) callbackRef.current(response.credential)
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        })

        containerRef.current.replaceChildren()
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          logo_alignment: "left",
          width: 320,
        })
      })
      .catch(() => {
        if (!cancelled) {
          setError("Google sign-in is unavailable right now.")
        }
      })

    return () => {
      cancelled = true
    }
  }, [clientId])

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        ref={containerRef}
        data-testid="google-signin"
        className={disabled ? "pointer-events-none opacity-50" : undefined}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export default GoogleSignInButton
