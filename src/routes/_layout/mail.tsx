import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query"
import { createFileRoute, redirect } from "@tanstack/react-router"
import { Mail, RefreshCw } from "lucide-react"
import { Suspense, useMemo, useState } from "react"

import { MailService, UsersService } from "@/client"
import { DataTable } from "@/components/Common/DataTable"
import { createMailColumns } from "@/components/Mail/columns"
import MailDetailDialog from "@/components/Mail/MailDetailDialog"
import PendingMail from "@/components/Pending/PendingMail"
import { Button } from "@/components/ui/button"
import useCustomToast from "@/hooks/useCustomToast"
import { handleError } from "@/utils"

const PAGE_SIZE = 100

function getMailQueryOptions() {
  return {
    queryFn: async () =>
      (
        await MailService.listMailMessages({
          query: { skip: 0, limit: PAGE_SIZE },
        })
      ).data,
    queryKey: ["mail"],
  }
}

export const Route = createFileRoute("/_layout/mail")({
  component: Mailbox,
  beforeLoad: async () => {
    const { data: user } = await UsersService.readUserMe()
    if (!user.is_superuser) {
      throw redirect({
        to: "/",
      })
    }
  },
  head: () => ({
    meta: [
      {
        title: "Mailbox - FastAPI Template",
      },
    ],
  }),
})

function MailTableContent({ onView }: { onView: (id: string) => void }) {
  const { data: mail } = useSuspenseQuery(getMailQueryOptions())
  const columns = useMemo(() => createMailColumns(onView), [onView])

  if (mail.data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-12">
        <div className="rounded-full bg-muted p-4 mb-4">
          <Mail className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No messages yet</h3>
        <p className="text-muted-foreground">
          Use Refresh to poll the customer service inbox.
        </p>
      </div>
    )
  }

  return <DataTable columns={columns} data={mail.data} />
}

function MailTable({ onView }: { onView: (id: string) => void }) {
  return (
    <Suspense fallback={<PendingMail />}>
      <MailTableContent onView={onView} />
    </Suspense>
  )
}

function Mailbox() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showSuccessToast, showErrorToast } = useCustomToast()

  const pollMutation = useMutation({
    mutationFn: () => MailService.pollMailbox({ query: { limit: 10 } }),
    onSuccess: ({ data }) => {
      showSuccessToast(
        `Mailbox refreshed (${data.mode}): ${data.stored} stored, ${data.skipped} skipped`,
      )
      queryClient.invalidateQueries({ queryKey: ["mail"] })
    },
    onError: handleError.bind(showErrorToast),
  })

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mailbox</h1>
          <p className="text-muted-foreground">
            Customer service inbox, newest first
          </p>
        </div>
        <Button
          onClick={() => pollMutation.mutate()}
          disabled={pollMutation.isPending}
        >
          <RefreshCw
            className={pollMutation.isPending ? "animate-spin" : undefined}
          />
          Refresh
        </Button>
      </div>

      <MailTable onView={setSelectedId} />

      <MailDetailDialog
        mailId={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  )
}
