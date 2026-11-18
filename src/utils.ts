import { AxiosError } from "axios"

import type { ErrorResponse } from "@/client"

/**
 * The body our API sends on failure. Domain errors are `{detail: string}`;
 * FastAPI request-validation errors are `{detail: [{msg, ...}]}`.
 */
type ErrorBody = {
  detail?: ErrorResponse["detail"] | { msg: string }[]
}

function extractErrorMessage(err: Error): string {
  if (err instanceof AxiosError) {
    const errDetail = (err.response?.data as ErrorBody | undefined)?.detail
    if (Array.isArray(errDetail) && errDetail.length > 0) {
      return errDetail[0].msg
    }
    if (typeof errDetail === "string") {
      return errDetail
    }
    return err.message
  }
  return "Something went wrong."
}

export const handleError = function (this: (msg: string) => void, err: Error) {
  const errorMessage = extractErrorMessage(err)
  this(errorMessage)
}

export const getInitials = (name: string): string => {
  return name
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()
}
