import { FcGoogle } from "react-icons/fc"

import { Button } from "@/components/ui/button"

interface GoogleSignInButtonProps {
  disabled?: boolean
}

const GoogleSignInButton = ({ disabled = false }: GoogleSignInButtonProps) => {
  const apiBase = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "")

  const startGoogleLogin = () => {
    window.location.assign(`${apiBase}/api/v1/auth/google/start`)
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      data-testid="google-signin"
      disabled={disabled}
      onClick={startGoogleLogin}
    >
      <FcGoogle />
      Continue with Google
    </Button>
  )
}

export default GoogleSignInButton
