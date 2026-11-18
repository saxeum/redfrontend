import { useQuery } from "@tanstack/react-query"

import { MailService } from "@/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface MailDetailDialogProps {
  mailId: string | null
  onClose: () => void
}

const formatReceived = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value))

const MailDetailDialog = ({ mailId, onClose }: MailDetailDialogProps) => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["mail", mailId],
    queryFn: async () => {
      if (!mailId) throw new Error("Missing mail id")
      return (await MailService.readMailMessage({ path: { mail_id: mailId } }))
        .data
    },
    enabled: mailId !== null,
  })

  return (
    <Dialog
      open={mailId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {isPending ? "Loading message…" : (data?.subject ?? "(no subject)")}
          </DialogTitle>
          <DialogDescription>
            {data
              ? `${data.from_address} · ${formatReceived(data.received_at)}`
              : null}
          </DialogDescription>
        </DialogHeader>

        {isPending ? (
          <div className="flex flex-col gap-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            Could not load this message.
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap break-words text-sm">
            {data?.body}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default MailDetailDialog
